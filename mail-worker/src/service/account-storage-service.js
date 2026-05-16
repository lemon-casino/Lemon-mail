import { and, eq, inArray, like, sql } from 'drizzle-orm';
import BizError from '../error/biz-error';
import { isDel } from '../const/entity-const';
import orm from '../entity/orm';
import account from '../entity/account';
import accountCollectRule from '../entity/account-collect-rule';
import accountCollectOverride from '../entity/account-collect-override';
import emailUtils from '../utils/email-utils';
import { t } from '../i18n/i18n';

const STORAGE_SCOPE = {
	INBOX: 'inbox',
	SENT: 'sent',
	DRAFT: 'draft',
};

const RULE_STATUS = {
	INACTIVE: 0,
	ACTIVE: 1,
};

const DISPLAY_STATE = {
	VISIBLE: 'visible',
	COLLECTED: 'collected',
};

const SOURCE_TYPE = {
	MANUAL_COLLECT: 'manual_collect',
	MANUAL_RELEASE: 'manual_release',
	NEW_ACCOUNT_VISIBLE: 'new_account_visible',
};

const ALLOWED_SCOPE = Object.values(STORAGE_SCOPE);

const accountStorageService = {

	async config(c, params, userId) {
		const scope = this.normalizeScope(params.scope);

		const [rules, overrides] = await Promise.all([
			orm(c)
				.select({
					ruleId: accountCollectRule.ruleId,
					scope: accountCollectRule.scope,
					ruleType: accountCollectRule.ruleType,
					ruleValue: accountCollectRule.ruleValue,
					status: accountCollectRule.status,
				})
				.from(accountCollectRule)
				.where(and(
					eq(accountCollectRule.userId, userId),
					eq(accountCollectRule.scope, scope),
					eq(accountCollectRule.status, RULE_STATUS.ACTIVE),
				))
				.all(),
			orm(c)
				.select({
					overrideId: accountCollectOverride.overrideId,
					accountId: accountCollectOverride.accountId,
					scope: accountCollectOverride.scope,
					displayState: accountCollectOverride.displayState,
					sourceType: accountCollectOverride.sourceType,
				})
				.from(accountCollectOverride)
				.leftJoin(
					account,
					eq(account.accountId, accountCollectOverride.accountId),
				)
				.where(and(
					eq(accountCollectOverride.userId, userId),
					eq(accountCollectOverride.scope, scope),
					eq(account.isDel, isDel.NORMAL),
				))
				.all(),
		]);

		return { scope, rules, overrides };
	},

	async domainCollect(c, params, userId) {
		const scope = this.normalizeScope(params.scope);
		const domain = this.normalizeDomain(params.domain);
		const operatorUserId = userId;

		const domainAccounts = await orm(c)
			.select({ accountId: account.accountId })
			.from(account)
			.where(and(
				eq(account.userId, userId),
				eq(account.isDel, isDel.NORMAL),
				like(sql`lower(${account.email})`, `%${domain}`),
			))
			.all();

		if (domainAccounts.length === 0) {
			throw new BizError(t('storageDomainNotFound'));
		}

		const existingRule = await orm(c)
			.select()
			.from(accountCollectRule)
			.where(and(
				eq(accountCollectRule.userId, userId),
				eq(accountCollectRule.scope, scope),
				eq(accountCollectRule.ruleType, 'domain'),
				eq(accountCollectRule.ruleValue, domain),
			))
			.get();

		if (existingRule) {
			await orm(c)
				.update(accountCollectRule)
				.set({
					status: RULE_STATUS.ACTIVE,
					updatedBy: operatorUserId,
					updateTime: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(accountCollectRule.ruleId, existingRule.ruleId))
				.run();
		} else {
			await orm(c)
				.insert(accountCollectRule)
				.values({
					userId,
					scope,
					ruleType: 'domain',
					ruleValue: domain,
					status: RULE_STATUS.ACTIVE,
					updatedBy: operatorUserId,
				})
				.run();
		}

		await orm(c)
			.delete(accountCollectOverride)
			.where(and(
				eq(accountCollectOverride.userId, userId),
				eq(accountCollectOverride.scope, scope),
				inArray(accountCollectOverride.accountId, domainAccounts.map(item => item.accountId)),
			))
			.run();

		return this.config(c, { scope }, userId);
	},

	async collect(c, params, userId) {
		const scope = this.normalizeScope(params.scope);
		const accountIds = this.normalizeAccountIds(params.accountIds);
		const accountList = await this.selectUserAccounts(c, userId, accountIds);
		const domainRules = await this.selectDomainRuleSet(c, userId, scope);

		for (const accountRow of accountList) {
			const domain = this.getEmailDomain(accountRow.email);
			const hasDomainRule = domainRules.has(domain);

			if (hasDomainRule) {
				await this.removeOverride(c, userId, scope, accountRow.accountId);
				continue;
			}

			await this.upsertOverride(c, {
				userId,
				accountId: accountRow.accountId,
				scope,
				displayState: DISPLAY_STATE.COLLECTED,
				sourceType: SOURCE_TYPE.MANUAL_COLLECT,
				updatedBy: userId,
			});
		}

		return this.config(c, { scope }, userId);
	},

	async release(c, params, userId) {
		const scope = this.normalizeScope(params.scope);
		const accountIds = this.normalizeAccountIds(params.accountIds);
		const accountList = await this.selectUserAccounts(c, userId, accountIds);

		for (const accountRow of accountList) {
			await this.upsertOverride(c, {
				userId,
				accountId: accountRow.accountId,
				scope,
				displayState: DISPLAY_STATE.VISIBLE,
				sourceType: SOURCE_TYPE.MANUAL_RELEASE,
				updatedBy: userId,
			});
		}

		return this.config(c, { scope }, userId);
	},

	async keepNewAccountVisible(c, userId, accountRow, updatedBy = userId) {
		const domain = this.getEmailDomain(accountRow?.email);

		if (!domain || !accountRow?.accountId) {
			return;
		}

		const matchedRules = await orm(c)
			.select({
				scope: accountCollectRule.scope,
			})
			.from(accountCollectRule)
			.where(and(
				eq(accountCollectRule.userId, userId),
				eq(accountCollectRule.ruleType, 'domain'),
				eq(accountCollectRule.ruleValue, domain),
				eq(accountCollectRule.status, RULE_STATUS.ACTIVE),
			))
			.all();

		for (const { scope } of matchedRules) {
			await this.upsertOverride(c, {
				userId,
				accountId: accountRow.accountId,
				scope,
				displayState: DISPLAY_STATE.VISIBLE,
				sourceType: SOURCE_TYPE.NEW_ACCOUNT_VISIBLE,
				updatedBy,
			});
		}
	},

	normalizeScope(scope) {
		const normalized = String(scope || '').trim().toLowerCase();
		if (!ALLOWED_SCOPE.includes(normalized)) {
			throw new BizError(t('storageScopeInvalid'));
		}
		return normalized;
	},

	normalizeDomain(domain) {
		let normalized = String(domain || '').trim().toLowerCase();

		if (!normalized) {
			throw new BizError(t('storageDomainInvalid'));
		}

		if (!normalized.startsWith('@')) {
			normalized = `@${normalized}`;
		}

		const nakedDomain = normalized.slice(1);
		if (!nakedDomain || nakedDomain.includes('@') || nakedDomain.includes(' ')) {
			throw new BizError(t('storageDomainInvalid'));
		}

		return normalized;
	},

	normalizeAccountIds(accountIds) {
		const ids = Array.isArray(accountIds) ? accountIds : [];
		const normalized = [...new Set(ids.map(Number).filter(id => Number.isInteger(id) && id > 0))];

		if (normalized.length === 0) {
			throw new BizError(t('storageNoAccountSelected'));
		}

		return normalized;
	},

	async selectUserAccounts(c, userId, accountIds) {
		const accountList = await orm(c)
			.select({
				accountId: account.accountId,
				email: account.email,
			})
			.from(account)
			.where(and(
				eq(account.userId, userId),
				eq(account.isDel, isDel.NORMAL),
				inArray(account.accountId, accountIds),
			))
			.all();

		if (accountList.length !== accountIds.length) {
			throw new BizError(t('accountNotFound'));
		}

		return accountList;
	},

	async selectDomainRuleSet(c, userId, scope) {
		const rules = await orm(c)
			.select({
				ruleValue: accountCollectRule.ruleValue,
			})
			.from(accountCollectRule)
			.where(and(
				eq(accountCollectRule.userId, userId),
				eq(accountCollectRule.scope, scope),
				eq(accountCollectRule.ruleType, 'domain'),
				eq(accountCollectRule.status, RULE_STATUS.ACTIVE),
			))
			.all();

		return new Set(rules.map(item => this.normalizeDomain(item.ruleValue)));
	},

	async upsertOverride(c, data) {
		const existing = await orm(c)
			.select()
			.from(accountCollectOverride)
			.where(and(
				eq(accountCollectOverride.userId, data.userId),
				eq(accountCollectOverride.accountId, data.accountId),
				eq(accountCollectOverride.scope, data.scope),
			))
			.get();

		if (existing) {
			await orm(c)
				.update(accountCollectOverride)
				.set({
					displayState: data.displayState,
					sourceType: data.sourceType,
					updatedBy: data.updatedBy,
					updateTime: sql`CURRENT_TIMESTAMP`,
				})
				.where(eq(accountCollectOverride.overrideId, existing.overrideId))
				.run();
			return;
		}

		await orm(c)
			.insert(accountCollectOverride)
			.values(data)
			.run();
	},

	async removeOverride(c, userId, scope, accountId) {
		await orm(c)
			.delete(accountCollectOverride)
			.where(and(
				eq(accountCollectOverride.userId, userId),
				eq(accountCollectOverride.scope, scope),
				eq(accountCollectOverride.accountId, accountId),
			))
			.run();
	},

	getEmailDomain(email) {
		const domain = emailUtils.getDomain(email);
		return domain ? `@${domain.toLowerCase()}` : '';
	},
};

export default accountStorageService;
