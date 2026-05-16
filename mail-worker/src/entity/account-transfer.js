import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const accountTransfer = sqliteTable('account_transfer', {
    transferId: integer('transfer_id').primaryKey({ autoIncrement: true }),
    accountId: integer('account_id').notNull(),
    accountEmail: text('account_email').notNull().default(''),
    fromUserId: integer('from_user_id').notNull(),
    toUserId: integer('to_user_id').notNull(),
    status: integer('status').default(0).notNull(), // 0=pending, 1=accepted, 2=rejected
    createTime: text('create_time').default(sql`CURRENT_TIMESTAMP`),
});

export default accountTransfer;
