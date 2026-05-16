import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accountCollectRule = sqliteTable('account_collect_rule', {
	ruleId: integer('rule_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	scope: text('scope').notNull(),
	ruleType: text('rule_type').notNull().default('domain'),
	ruleValue: text('rule_value').notNull(),
	status: integer('status').notNull().default(1),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: text('update_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedBy: integer('updated_by').notNull().default(0),
});

export default accountCollectRule;
