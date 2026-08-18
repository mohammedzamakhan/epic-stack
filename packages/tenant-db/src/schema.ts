import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

export const customers = sqliteTable('customers', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => randomUUID()),
	name: text('name').notNull(),
	email: text('email'),
	phone: text('phone').unique(),
	phoneVerified: integer('phone_verified', { mode: 'boolean' }).default(false),
	phoneVerificationCode: text('phone_verification_code'),
	phoneVerificationExpiresAt: integer('phone_verification_expires_at', {
		mode: 'timestamp',
	}),
	refreshTokenHash: text('refresh_token_hash'),
	refreshTokenExpiresAt: integer('refresh_token_expires_at', {
		mode: 'timestamp',
	}),
	createdAt: integer('created_at', { mode: 'timestamp' }).default(
		sql`(strftime('%s', 'now'))`,
	),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
		sql`(strftime('%s', 'now'))`,
	),
})
