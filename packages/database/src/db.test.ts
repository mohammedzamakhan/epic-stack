/// <reference types="vitest/globals" />
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { eq, getTableName, sql } from 'drizzle-orm'
import { db } from './client'
import { countUsers } from './queries'
import { User } from './schema'

const dbFile = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../db/data.db',
)
const describeDb = fs.existsSync(dbFile) ? describe : describe.skip

test('control-plane table names use PascalCase SQLite identifiers', () => {
	expect(getTableName(User)).toBe('User')
})

describeDb('Drizzle control-plane client', () => {
	test('can query the User table from SQLite', async () => {
		const rows = await db
			.select({
				id: User.id,
				email: User.email,
				username: User.username,
				createdAt: User.createdAt,
			})
			.from(User)
			.limit(5)

		expect(Array.isArray(rows)).toBe(true)

		const countRow = await db.get<{ count: number }>(
			sql`SELECT COUNT(*) as count FROM "User"`,
		)
		expect(countRow?.count).toBeGreaterThanOrEqual(0)
		expect(rows.length).toBeLessThanOrEqual(countRow?.count ?? 0)
		expect(await countUsers()).toBe(countRow?.count ?? 0)

		if (rows[0]) {
			expect(rows[0].id).toEqual(expect.any(String))
			expect(rows[0].email).toEqual(expect.any(String))
			expect(rows[0].createdAt).toBeInstanceOf(Date)

			const byId = await db
				.select({ id: User.id })
				.from(User)
				.where(eq(User.id, rows[0].id))
			expect(byId).toHaveLength(1)
		}
	})
})
