import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const subWorker = sqliteTable('sub_worker', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	url: text('url').notNull(),
	apiToken: text('api_token').notNull(),
	domains: text('domains').default('[]').notNull(),
	status: integer('status').default(1).notNull(),
	createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`),
});

export default subWorker;
