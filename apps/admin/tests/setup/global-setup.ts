import path from 'node:path'
import { execaCommand } from 'execa'
import fsExtra from 'fs-extra'
import 'varlock/auto-load'

import '#app/utils/cache.server.ts'

export const BASE_DATABASE_PATH = path.join(
	process.cwd(),
	`./tests/database/base.db`,
)

const CONTROL_PLANE_SCHEMA = path.resolve(
	process.cwd(),
	'../../packages/database/src/schema.ts',
)
const CONTROL_PLANE_MIGRATIONS = path.resolve(
	process.cwd(),
	'../../packages/database/migrations',
)
const CONTROL_PLANE_MIGRATE = path.resolve(
	process.cwd(),
	'../../packages/database/scripts/migrate.mjs',
)

async function latestSourceMtime() {
	const schemaStat = await fsExtra.stat(CONTROL_PLANE_SCHEMA)
	let latest = schemaStat.mtimeMs
	const entries = await fsExtra.readdir(CONTROL_PLANE_MIGRATIONS, {
		withFileTypes: true,
	})
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		const sqlPath = path.join(
			CONTROL_PLANE_MIGRATIONS,
			entry.name,
			'migration.sql',
		)
		if (await fsExtra.pathExists(sqlPath)) {
			const stat = await fsExtra.stat(sqlPath)
			if (stat.mtimeMs > latest) latest = stat.mtimeMs
		}
	}
	return latest
}

export async function setup() {
	const databaseExists = await fsExtra.pathExists(BASE_DATABASE_PATH)

	if (databaseExists) {
		const databaseLastModifiedAt = (await fsExtra.stat(BASE_DATABASE_PATH))
			.mtimeMs
		if (databaseLastModifiedAt > (await latestSourceMtime())) {
			return
		}
		await fsExtra.remove(BASE_DATABASE_PATH)
		await fsExtra.remove(`${BASE_DATABASE_PATH}-wal`).catch(() => {})
		await fsExtra.remove(`${BASE_DATABASE_PATH}-shm`).catch(() => {})
	}

	await execaCommand(`node ${CONTROL_PLANE_MIGRATE}`, {
		stdio: 'inherit',
		env: {
			...process.env,
			DATABASE_URL: `file:${BASE_DATABASE_PATH}`,
		},
	})
}
