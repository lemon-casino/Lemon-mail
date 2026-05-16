import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const accountCollectOverride = sqliteTable('account_collect_override', {
	overrideId: integer('override_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	accountId: integer('account_id').notNull(),
	scope: text('scope').notNull(),
	displayState: text('display_state').notNull(),
	sourceType: text('source_type').notNull().default('manual_collect'),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updateTime: text('update_time').default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedBy: integer('updated_by').notNull().default(0),
});

export default accountCollectOverride;
