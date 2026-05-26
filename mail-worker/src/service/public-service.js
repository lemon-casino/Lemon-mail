import BizError from '../error/biz-error';
import orm from '../entity/orm';
import { v4 as uuidv4 } from 'uuid';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import saltHashUtils from '../utils/crypto-utils';
import cryptoUtils from '../utils/crypto-utils';
import emailUtils from '../utils/email-utils';
import roleService from './role-service';
import verifyUtils from '../utils/verify-utils';
import { t } from '../i18n/i18n';
import reqUtils from '../utils/req-utils';
import dayjs from 'dayjs';
import { isDel, roleConst, settingConst } from '../const/entity-const';
import email from '../entity/email';
import account from '../entity/account';
import userService from './user-service';
import settingService from './setting-service';
import KvConst from '../const/kv-const';

function normalizeEmail(value = '') {
	return String(value || '').trim().toLowerCase();
}

function normalizeDomainList(c) {
	let domainList = c.env.domain;
	if (typeof domainList === 'string') {
		try {
			domainList = JSON.parse(domainList);
		} catch {
			domainList = domainList.split(',');
		}
	}
	return Array.isArray(domainList)
		? domainList.map(item => String(item || '').trim().toLowerCase()).filter(Boolean)
		: [];
}

function assertPublicEmailDomain(c, value) {
	const domain = emailUtils.getDomain(value).toLowerCase();
	if (!normalizeDomainList(c).includes(domain)) {
		throw new BizError(t('notEmailDomain'));
	}
}

function isAdminLoginDomain(c, value) {
	const adminDomain = emailUtils.getDomain(c.env.admin).toLowerCase();
	const emailDomain = emailUtils.getDomain(value).toLowerCase();
	return adminDomain && emailDomain === adminDomain;
}

function normalizeNumber(value, defaultValue) {
	const num = Number(value);
	return Number.isFinite(num) ? num : defaultValue;
}

const publicService = {

	async emailList(c, params = {}) {

		let { toEmail, content, subject, sendName, sendEmail, timeSort, num, size, type , isDel: delStatus } = params

		const query = orm(c).select({
				emailId: email.emailId,
				sendEmail: email.sendEmail,
				sendName: email.name,
				subject: email.subject,
				toEmail: email.toEmail,
				toName: email.toName,
				type: email.type,
				createTime: email.createTime,
				content: email.content,
				text: email.text,
				isDel: email.isDel,
		}).from(email)

		size = Math.min(Math.max(normalizeNumber(size, 20), 1), 100);
		num = Math.max(normalizeNumber(num, 1), 1);
		const offset = (num - 1) * size;

		let conditions = []

		if (toEmail) {
			conditions.push(sql`${email.toEmail} COLLATE NOCASE = ${normalizeEmail(toEmail)}`)
		}

		if (sendEmail) {
			conditions.push(sql`${email.sendEmail} COLLATE NOCASE = ${normalizeEmail(sendEmail)}`)
		}

		if (sendName) {
			conditions.push(sql`${email.name} COLLATE NOCASE LIKE ${sendName}`)
		}

		if (subject) {
			conditions.push(sql`${email.subject} COLLATE NOCASE LIKE ${subject}`)
		}

		if (content) {
			conditions.push(sql`${email.content} COLLATE NOCASE LIKE ${content}`)
		}

		const typeNumber = Number(type);
		if (!Number.isNaN(typeNumber)) {
			conditions.push(eq(email.type, typeNumber))
		}

		const delNumber = Number(delStatus);
		if (!Number.isNaN(delNumber)) {
			conditions.push(eq(email.isDel, delNumber))
		}

		if (conditions.length === 1) {
			query.where(...conditions)
		} else if (conditions.length > 1) {
			query.where(and(...conditions))
		}

		if (timeSort === 'asc') {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		return query.limit(size).offset(offset);

	},

	async addUser(c, params = {}) {
		const list = Array.isArray(params?.list) ? params.list : [];

		if (list.length === 0) return;

		const seenEmails = new Set();
		for (const emailRow of list) {
			emailRow.email = normalizeEmail(emailRow.email);

			if (!verifyUtils.isEmail(emailRow.email)) {
				throw new BizError(t('notEmail'));
			}
			if (seenEmails.has(emailRow.email)) {
				emailRow.skip = true;
				continue;
			}
			seenEmails.add(emailRow.email);

			assertPublicEmailDomain(c, emailRow.email);

			const { salt, hash } = await saltHashUtils.hashPassword(
				emailRow.password || cryptoUtils.genRandomPwd()
			);

			emailRow.salt = salt;
			emailRow.hash = hash;
		}


		const activeIp = reqUtils.getIp(c);
		const { os, browser, device } = reqUtils.getUserAgent(c);
		const activeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

		const roleList = await roleService.roleSelectUse(c);
		const defRole = roleList.find(roleRow => roleRow.isDefault === roleConst.isDefault.OPEN);
		if (!defRole) {
			throw new BizError('Default role does not exist.');
		}
		const setting = await settingService.query(c);

		const userList = [];

		for (const emailRow of list) {
			if (emailRow.skip) continue;
			let { email, hash, salt, roleName } = emailRow;
			if (
				isAdminLoginDomain(c, email)
				&& setting.publicApiAdminDomain !== settingConst.publicApiAdminDomain.OPEN
			) {
				throw new BizError(t('publicApiAdminDomainDisabled'), 403);
			}
			const existedUser = await userService.selectByEmailIncludeDel(c, email);
			const existedAccount = await orm(c).select().from(account).where(sql`${account.email} COLLATE NOCASE = ${email}`).get();
			if (existedUser && existedAccount && existedUser.isDel === isDel.NORMAL && existedAccount.isDel === isDel.NORMAL) {
				continue;
			}
			if (existedUser || existedAccount) {
				throw new BizError(t('emailExistDatabase'));
			}

			let type = defRole.roleId;

			if (roleName) {
				const roleRow = roleList.find(role => role.name === roleName);
				type = roleRow ? roleRow.roleId : type;
			}

			userList.push({
				email,
				password: hash,
				salt,
				type,
				os,
				browser,
				activeIp,
				createIp: activeIp,
				device,
				activeTime,
				createTime: activeTime,
			});
			userList.push({ email });

		}

		try {
			for (const item of userList) {
				if (item?.password) {
					await userService.insert(c, item);
				} else if (item?.email) {
					const userRow = await userService.selectByEmailIncludeDel(c, item.email);
					await orm(c).insert(account).values({
						email: item.email,
						name: emailUtils.getName(item.email),
						userId: userRow.userId,
					}).run();
				}
			}
		} catch (e) {
			if(e.message.includes('SQLITE_CONSTRAINT')) {
				throw new BizError(t('emailExistDatabase'))
			} else {
				throw e
			}
		}

	},

	async genToken(c, params) {

		await this.verifyUser(c, params)

		const uuid = uuidv4();

		await c.env.kv.put(KvConst.PUBLIC_KEY, uuid);

		return {token: uuid}
	},

	async verifyUser(c, params) {

		const { email, password } = params

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (email !== c.env.admin) {
			throw new BizError(t('notAdmin'));
		}

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}
	}

}

export default publicService
