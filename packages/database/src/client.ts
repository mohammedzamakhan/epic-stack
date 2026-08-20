import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { remember } from '@epic-web/remember'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as relations from './relations.ts'
import * as tables from './schema.ts'

export const schema = { ...tables, ...relations }

const packageDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
)

/**
 * Resolve the control-plane SQLite file to an absolute `file:` URL.
 *
 * `DATABASE_URL` may be cwd-relative (`file:./db/data.db`) or absolute.
 * Prefer an existing file so all processes open the same database.
 */
export function resolveSqliteFileUrl() {
	const raw = process.env.DATABASE_URL
	if (raw) {
		const filePath = raw.replace(/^file:/, '').replace(/\?.*$/, '')
		if (path.isAbsolute(filePath)) {
			return `file:${filePath}`
		}

		const fromCwd = path.resolve(process.cwd(), filePath)
		if (fs.existsSync(fromCwd)) {
			return `file:${fromCwd}`
		}

		const fromPackage = path.resolve(packageDir, filePath)
		if (fs.existsSync(fromPackage)) {
			return `file:${fromPackage}`
		}

		if (process.env.DATABASE_PATH) {
			return `file:${path.resolve(process.cwd(), process.env.DATABASE_PATH)}`
		}

		return `file:${fromCwd}`
	}

	if (process.env.DATABASE_PATH) {
		return `file:${path.resolve(process.cwd(), process.env.DATABASE_PATH)}`
	}

	return `file:${path.resolve(packageDir, 'db/data.db')}`
}

export const sqliteClient = remember('libsql', () =>
	createClient({ url: resolveSqliteFileUrl() }),
)

export const db = remember('drizzle', () => drizzle(sqliteClient, { schema }))
