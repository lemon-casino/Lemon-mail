import BizError from '../error/biz-error';
import verifyUtils from '../utils/verify-utils';
import emailUtils from '../utils/email-utils';
import userService from './user-service';
import emailService from './email-service';
import orm from '../entity/orm';
import account from '../entity/account';
import { and, asc, eq, gt, inArray, count, sql, ne, or, lt, desc } from 'drizzle-orm';
import {accountConst, isDel, settingConst} from '../const/entity-const';
import settingService from './setting-service';
import turnstileService from './turnstile-service';
import roleService from './role-service';
import accountStorageService from './account-storage-service';
import { t } from '../i18n/i18n';
import verifyRecordService from './verify-record-service';
import prefixUtils from '../utils/prefix-utils';

const accountService = {

	async add(c, params, userId) {

		const { addEmailVerify , addEmail, manyEmail, addVerifyCount, minEmailPrefix, emailPrefixFilter, emailKeywordBlacklist } = await settingService.query(c);

		let { email, token } = params;


		if (!(addEmail === settingConst.addEmail.OPEN && manyEmail === settingConst.manyEmail.OPEN)) {
			throw new BizError(t('addAccountDisabled'));
		}


		if (!email) {
			throw new BizError(t('emptyEmail'));
		}

		if (!verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}

		if (!c.env.domain.includes(emailUtils.getDomain(email))) {
			throw new BizError(t('notExistDomain'));
		}

		if (emailUtils.getName(email).length < minEmailPrefix) {
			throw new BizError(t('minEmailPrefix', { msg: minEmailPrefix } ));
		}

		if (emailPrefixFilter.some(content => emailUtils.getName(email).includes(content))) {
			throw new BizError(t('banEmailPrefix'));
		}

		let accountRow = await this.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelAccount'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}

		const userRow = await userService.selectById(c, userId);

		if (userRow.email !== c.env.admin && !userRow.addEmailEnabled) {
			throw new BizError(t('addEmailDisabledForUser'), 403);
		}

		if (emailKeywordBlacklist.length > 0 && userRow.email !== c.env.admin) {
			const emailName = emailUtils.getName(email).toLowerCase();
			if (emailKeywordBlacklist.some(kw => emailName.includes(kw.toLowerCase()))) {
				throw new BizError(t('emailKeywordBlocked'));
			}
		}

		const roleRow = await roleService.selectById(c, userRow.type);

		if (userRow.email !== c.env.admin) {

			if (roleRow.accountCount > 0) {
				const userAccountCount = await accountService.countUserAccount(c, userId)
				if(userAccountCount >= roleRow.accountCount) throw new BizError(t('accountLimit'), 403);
			}

			if(!roleService.hasAvailDomainPerm(roleRow.availDomain, email)) {
				throw new BizError(t('noDomainPermAdd'),403)
			}

		}

		let addVerifyOpen = false

		// Admin bypasses Turnstile verification
		const currentUserEmail = c.get('user')?.email;
		const isAdmin = currentUserEmail && currentUserEmail === c.env.admin;

		if (!isAdmin) {
			if (addEmailVerify === settingConst.addEmailVerify.OPEN) {
				addVerifyOpen = true
				await turnstileService.verify(c, token);
			}

			if (addEmailVerify === settingConst.addEmailVerify.COUNT) {
				addVerifyOpen = await verifyRecordService.isOpenAddVerify(c, addVerifyCount);
				if (addVerifyOpen) {
					await turnstileService.verify(c, token)
				}
			}
		}


		const sort = await this.nextSort(c, userId);
		accountRow = await orm(c).insert(account).values({ email: email, userId: userId, name: emailUtils.getName(email), sort }).returning().get();
		await accountStorageService.keepNewAccountVisible(c, userId, accountRow, userId);

		if (addEmailVerify === settingConst.addEmailVerify.COUNT && !addVerifyOpen) {
			const row = await verifyRecordService.increaseAddCount(c);
			addVerifyOpen = row.count >= addVerifyCount
		}

		accountRow.addVerifyOpen = addVerifyOpen
		return accountRow;
	},

	async generatePrefix(c, params, userId) {
		const {
			minEmailPrefix,
			randomPrefixLength,
			emailPrefixFilter,
			emailKeywordBlacklist
		} = await settingService.query(c);

		const suffixInput = (params?.suffix || '').trim();
		const suffix = suffixInput.startsWith('@') ? suffixInput : `@${suffixInput}`;
		const mode = prefixUtils.normalizeMode(params?.mode);
		const userRow = await userService.selectById(c, userId);
		const isAdmin = userRow.email === c.env.admin;
		const prefixSize = Math.max(minEmailPrefix || 1, randomPrefixLength || 8);
		const maxAttempts = mode === prefixUtils.prefixMode.WORD ? 160 : 80;

		if (!isAdmin && !userRow.addEmailEnabled) {
			throw new BizError(t('addEmailDisabledForUser'), 403);
		}

		if (!suffixInput) {
			throw new BizError(t('notExistDomain'));
		}

		if (!c.env.domain.includes(emailUtils.getDomain(`demo${suffix}`))) {
			throw new BizError(t('notExistDomain'));
		}

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const prefix = mode === prefixUtils.prefixMode.WORD
				? prefixUtils.randomWord(minEmailPrefix, attempt)
				: prefixUtils.randomString(prefixSize);

			if (emailPrefixFilter.some(content => prefix.includes(content))) {
				continue;
			}

			if (!isAdmin && emailKeywordBlacklist.some(keyword => prefix.includes(keyword.toLowerCase()))) {
				continue;
			}

			const exists = await this.selectByEmailIncludeDel(c, `${prefix}${suffix}`);
			if (!exists) {
				return { prefix, mode };
			}
		}

		throw new BizError(t('prefixGenerateFailed'));
	},

	selectByEmailIncludeDel(c, email) {
		return orm(c).select().from(account).where(sql`${account.email} COLLATE NOCASE = ${email}`).get();
	},

	async list(c, params, userId) {

		let { accountId, size, lastSort, num, keyword } = params;

		accountId = Number(accountId);
		size = Number(size);
		lastSort = Number(lastSort);
		num = Number(num);
		keyword = String(keyword || '').trim();
		const pageMode = !Number.isNaN(num) && num > 0;

		if (size > 30) {
			size = 30;
		}

		if (!pageMode && !accountId) {
			accountId = 0;
			lastSort = 9999999999;
		} else if(Number.isNaN(lastSort)) {
			lastSort = 9999999999;
		}

		const baseConditions = [
			eq(account.userId, userId),
			eq(account.isDel, isDel.NORMAL),
		];

		if (keyword) {
			baseConditions.push(
				or(
					sql`${account.email} COLLATE NOCASE LIKE ${`%${keyword}%`}`,
					sql`${account.name} COLLATE NOCASE LIKE ${`%${keyword}%`}`,
				)
			);
		}

		const listConditions = [...baseConditions];

		if (!pageMode) {
			listConditions.push(
				or(
					lt(account.sort, lastSort),
					and(
						eq(account.sort, lastSort),
						lt(account.accountId, accountId)
					)
				)
			);
		}

		const query = orm(c).select().from(account).where(and(...listConditions))
			.orderBy(desc(account.sort), desc(account.accountId));

		if (!pageMode) {
			return query.limit(size).all();
		}

		const listQuery = query.limit(size).offset((num - 1) * size).all();
		const totalQuery = orm(c).select({ total: count() }).from(account).where(and(...baseConditions)).get();
		const [list, totalRow] = await Promise.all([listQuery, totalQuery]);

		return { list, total: totalRow.total };
	},

	async delete(c, params, userId) {

		let { accountId } = params;

		const user = await userService.selectById(c, userId);
		const accountRow = await this.selectById(c, accountId);

		if (!accountRow) {
			throw new BizError(t('accountNotFound'));
		}

		if (accountRow.email === user.email) {
			throw new BizError(t('delMyAccount'));
		}

		if (accountRow.userId !== user.userId) {
			throw new BizError(t('noUserAccount'));
		}

		await orm(c).update(account).set({ isDel: isDel.DELETE }).where(
			and(eq(account.userId, userId),
				eq(account.accountId, accountId)))
			.run();
	},

	async recoveryList(c, params, userId) {
		let { keyword, size, num } = params;
		keyword = String(keyword || '').trim();
		size = Number(size) || 50;
		num = Number(num) || 1;

		if (size > 100) {
			size = 100;
		}

		const conditions = [
			eq(account.userId, userId),
			eq(account.isDel, isDel.DELETE),
		];

		if (keyword) {
			conditions.push(sql`${account.email} COLLATE NOCASE LIKE ${`%${keyword}%`}`);
		}

		const query = orm(c)
			.select()
			.from(account)
			.where(and(...conditions))
			.orderBy(desc(account.accountId));

		const listQuery = query.limit(size).offset((num - 1) * size).all();
		const totalQuery = orm(c).select({ total: count() }).from(account).where(and(...conditions)).get();
		const [list, totalRow] = await Promise.all([listQuery, totalQuery]);

		return { list, total: totalRow.total };
	},

	async restore(c, params, userId) {
		const accountId = Number(params.accountId);

		if (!Number.isInteger(accountId) || accountId <= 0) {
			throw new BizError(t('accountNotFound'));
		}

		const accountRow = await this.selectByIdIncludeDel(c, accountId);

		if (!accountRow || accountRow.userId !== userId) {
			throw new BizError(t('accountNotFound'));
		}

		if (accountRow.isDel === isDel.NORMAL) {
			return accountRow;
		}

		const userRow = await userService.selectById(c, userId);
		const roleRow = await roleService.selectById(c, userRow.type);

		if (userRow.email !== c.env.admin) {
			if (roleRow.accountCount > 0) {
				const userAccountCount = await accountService.countUserAccount(c, userId);
				if (userAccountCount >= roleRow.accountCount) throw new BizError(t('accountLimit'), 403);
			}

			if (!roleService.hasAvailDomainPerm(roleRow.availDomain, accountRow.email)) {
				throw new BizError(t('noDomainPermAdd'), 403);
			}
		}

		const sort = await this.nextSort(c, userId);
		const restoredAccount = await orm(c)
			.update(account)
			.set({ isDel: isDel.NORMAL, sort })
			.where(and(
				eq(account.accountId, accountId),
				eq(account.userId, userId),
			))
			.returning()
			.get();

		await accountStorageService.keepNewAccountVisible(c, userId, restoredAccount, userId);
		return restoredAccount;
	},

	selectById(c, accountId) {
		return orm(c).select().from(account).where(
			and(eq(account.accountId, accountId),
				eq(account.isDel, isDel.NORMAL)))
			.get();
	},

	selectByIdIncludeDel(c, accountId) {
		return orm(c).select().from(account).where(eq(account.accountId, accountId)).get();
	},

	async nextSort(c, userId) {
		const row = await orm(c)
			.select({ maxSort: sql`COALESCE(MAX(${account.sort}), 0)` })
			.from(account)
			.where(and(
				eq(account.userId, userId),
				eq(account.isDel, isDel.NORMAL),
			))
			.get();

		return Number(row?.maxSort || 0) + 1;
	},

	async insert(c, params) {
		await orm(c).insert(account).values({ ...params }).returning();
	},

	async insertList(c, list) {
		await orm(c).insert(account).values(list).run();
	},

	async physicsDeleteByUserIds(c, userIds) {
		await emailService.physicsDeleteUserIds(c, userIds);
		await orm(c).delete(account).where(inArray(account.userId,userIds)).run();
	},

	async selectUserAccountCountList(c, userIds, del = isDel.NORMAL) {
		const result = await orm(c)
			.select({
				userId: account.userId,
				count: count(account.accountId)
			})
			.from(account)
			.where(and(
				inArray(account.userId, userIds),
				eq(account.isDel, del)
			))
			.groupBy(account.userId)
		return result;
	},

	async countUserAccount(c, userId) {
		const { num } = await orm(c).select({num: count()}).from(account).where(and(eq(account.userId, userId),eq(account.isDel, isDel.NORMAL))).get();
		return num;
	},

	async restoreByEmail(c, email) {
		await orm(c).update(account).set({isDel: isDel.NORMAL}).where(eq(account.email, email)).run();
	},

	async restoreByUserId(c, userId) {
		await orm(c).update(account).set({isDel: isDel.NORMAL}).where(eq(account.userId, userId)).run();
	},

	async setName(c, params, userId) {
		const { name, accountId } = params
		if (name.length > 30) {
			throw new BizError(t('usernameLengthLimit'));
		}
		await orm(c).update(account).set({name}).where(and(eq(account.userId, userId),eq(account.accountId, accountId))).run();
	},

	async allAccount(c, params) {

		let { userId, num, size } = params

		userId = Number(userId)

		num = Number(num)
		size = Number(size)

		if (size > 30) {
			size = 30;
		}

		num = (num - 1) * size;

		const userRow = await userService.selectByIdIncludeDel(c, userId);

		const list = await orm(c).select().from(account).where(and(eq(account.userId, userId),ne(account.email,userRow.email))).limit(size).offset(num);
		const { total } = await orm(c).select({ total: count() }).from(account).where(eq(account.userId, userId)).get();

		return { list, total }
	},

	async physicsDelete(c, params) {
		const { accountId } = params
		await emailService.physicsDeleteByAccountId(c, accountId)
		await orm(c).delete(account).where(eq(account.accountId, accountId)).run();
	},

	async physicsDeleteRecovered(c, params, userId) {
		const accountId = Number(params.accountId);

		if (!Number.isInteger(accountId) || accountId <= 0) {
			throw new BizError(t('accountNotFound'));
		}

		const accountRow = await this.selectByIdIncludeDel(c, accountId);

		if (!accountRow || accountRow.userId !== userId || accountRow.isDel !== isDel.DELETE) {
			throw new BizError(t('accountNotFound'));
		}

		await accountStorageService.removeOverridesByAccountId(c, userId, accountId);
		await this.physicsDelete(c, { accountId });
	},

	async setAllReceive(c, params, userId) {
		let a = null
		const { accountId } = params;
		const accountRow = await this.selectById(c, accountId);
		if (accountRow.userId !== userId) {
			return;
		}
		await orm(c).update(account).set({ allReceive: accountConst.allReceive.CLOSE }).where(eq(account.userId, userId)).run();
		await orm(c).update(account).set({ allReceive: accountRow.allReceive ? 0 : 1 }).where(eq(account.accountId, accountId)).run();
	},

	async setAsTop(c, params, userId) {
		const { accountId } = params;
		console.log(accountId);
		const userRow = await userService.selectById(c, userId);
		const mainAccountRow = await accountService.selectByEmailIncludeDel(c, userRow.email);
		let mainSort = mainAccountRow.sort === 0 ? 2 : mainAccountRow.sort + 1;
		await orm(c).update(account).set({ sort: mainSort }).where(eq(account.email, userRow.email )).run();
		await orm(c).update(account).set({ sort: mainSort - 1 }).where(and(eq(account.accountId, accountId),eq(account.userId,userId))).run();
	}
};

export default accountService;
