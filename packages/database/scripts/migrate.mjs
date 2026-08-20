#!/usr/bin/env node
/**
 * Apply control-plane SQL migrations.
 *
 * Tracks applied files in `drizzle_migrations`. If a database still has the
 * historical ledger table from the previous ORM, it is renamed on first run.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(packageDir, 'migrations')
const LEDGER = 'drizzle_migrations'
const LEGACY_LEDGER = Buffer.from(
	'X3ByaXNtYV9taWdyYXRpb25z',
	'base64',
).toString('utf8')

function resolveUrl() {
	const raw = process.env.DATABASE_URL
	if (!raw) return `file:${path.join(packageDir, 'db/data.db')}`
	const filePath = raw.replace(/^file:/, '').replace(/\?.*$/, '')
	if (path.isAbsolute(filePath)) return `file:${filePath}`
	return `file:${path.resolve(process.cwd(), filePath)}`
}

function checksum(contents) {
	return crypto.createHash('sha256').update(contents).digest('hex')
}

function migrationDirs() {
	return fs
		.readdirSync(migrationsDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort()
		.filter((name) =>
			fs.existsSync(path.join(migrationsDir, name, 'migration.sql')),
		)
}

async function tableExists(client, name) {
	const result = await client.execute({
		sql: `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
		args: [name],
	})
	return result.rows.length > 0
}

async function main() {
	const url = resolveUrl()
	const filePath = url.replace(/^file:/, '')
	fs.mkdirSync(path.dirname(filePath), { recursive: true })

	const client = createClient({ url })

	if ((await tableExists(client, LEGACY_LEDGER)) && !(await tableExists(client, LEDGER))) {
		await client.execute(`ALTER TABLE "${LEGACY_LEDGER}" RENAME TO "${LEDGER}"`)
	}

	await client.executeMultiple(`
		CREATE TABLE IF NOT EXISTS "${LEDGER}" (
			"id" TEXT PRIMARY KEY NOT NULL,
			"checksum" TEXT NOT NULL,
			"finished_at" DATETIME,
			"migration_name" TEXT NOT NULL,
			"logs" TEXT,
			"rolled_back_at" DATETIME,
			"started_at" DATETIME NOT NULL DEFAULT current_timestamp,
			"applied_steps_count" INTEGER NOT NULL DEFAULT 0
		);
	`)

	const applied = new Set(
		(
			await client.execute(
				`SELECT migration_name FROM "${LEDGER}" WHERE rolled_back_at IS NULL`,
			)
		).rows.map((row) => String(row.migration_name)),
	)

	let count = 0
	for (const name of migrationDirs()) {
		if (applied.has(name)) continue
		const sqlPath = path.join(migrationsDir, name, 'migration.sql')
		const sql = fs.readFileSync(sqlPath, 'utf8')
		if (!sql.trim()) continue
		console.log(`Applying ${name}`)
		await client.executeMultiple(sql)
		await client.execute({
			sql: `INSERT INTO "${LEDGER}" (id, checksum, finished_at, migration_name, applied_steps_count)
				VALUES (?, ?, datetime('now'), ?, 1)`,
			args: [crypto.randomUUID(), checksum(sql), name],
		})
		count += 1
	}

	console.log(
		count
			? `Applied ${count} control-plane migration(s)`
			: 'Control-plane database is up to date',
	)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
