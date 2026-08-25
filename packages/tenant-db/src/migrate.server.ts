import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { getTenantDb } from './db.server.ts'

const migrationLocks = new Map<string, Promise<unknown>>()

function isAlreadyAppliedError(error: unknown) {
	const parts: string[] = []
	let current: unknown = error
	for (let i = 0; i < 5 && current; i++) {
		if (current instanceof Error) {
			parts.push(current.message)
			current = (current as { cause?: unknown }).cause
		} else {
			parts.push(String(current))
			break
		}
	}
	return parts.some((message) => /already exists/i.test(message))
}

async function hasCustomersTable(db: Awaited<ReturnType<typeof getTenantDb>>) {
	const row = await db.get<{ name: string }>(
		sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'customers' LIMIT 1`,
	)
	return Boolean(row?.name)
}

/**
 * Provisions a database for a given tenant.
 * Applies the latest Drizzle migrations to ensure the schema is up to date.
 * Safe to call again if the schema is already present (republish / retry).
 */
export async function provisionTenantDb(orgId: string) {
	if (!migrationLocks.has(orgId)) {
		const promise = (async () => {
			try {
				const db = await getTenantDb(orgId, { createIfMissing: true })

				const currentFile = fileURLToPath(import.meta.url)
				const pkgRoot = path.dirname(path.dirname(currentFile))
				const migrationsFolder = path.join(pkgRoot, 'drizzle')

				console.info(`Provisioning tenant DB for orgId: ${orgId}`)

				let retries = 5
				let delay = 100
				while (true) {
					try {
						await migrate(db, { migrationsFolder })
						break
					} catch (error: unknown) {
						const sqliteBusy =
							error instanceof Error &&
							(error.message.includes('SQLITE_BUSY') ||
								(error as { code?: string }).code === 'SQLITE_BUSY')

						if (retries > 0 && sqliteBusy) {
							console.warn(
								`SQLITE_BUSY during migration for ${orgId}, retrying in ${delay}ms...`,
							)
							await new Promise((resolve) => setTimeout(resolve, delay))
							retries--
							delay *= 2
							continue
						}

						if (isAlreadyAppliedError(error) && (await hasCustomersTable(db))) {
							console.info(
								`Tenant DB for ${orgId} already migrated; treating provision as success`,
							)
							break
						}

						throw error
					}
				}

				console.info(`Successfully provisioned tenant DB for orgId: ${orgId}`)
				return db
			} finally {
				migrationLocks.delete(orgId)
			}
		})()
		migrationLocks.set(orgId, promise)
	}
	return await migrationLocks.get(orgId)
}
