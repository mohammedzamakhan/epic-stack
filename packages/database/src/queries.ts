import { count, eq, sql } from 'drizzle-orm'
import { db } from './client'
import { SSOConfiguration, SSOSession, User } from './schema'

/** Lightweight connectivity probe used by Fly HTTP healthchecks. */
export async function pingControlPlane() {
	await db.run(sql`SELECT 1`)
}

export async function countUsers() {
	const [row] = await db.select({ value: count() }).from(User)
	return row?.value ?? 0
}

export async function countSsoConfigurations(options?: { enabled?: boolean }) {
	const query = db.select({ value: count() }).from(SSOConfiguration)
	const [row] =
		options?.enabled === undefined
			? await query
			: await query.where(eq(SSOConfiguration.isEnabled, options.enabled))
	return row?.value ?? 0
}

export async function countSsoSessions() {
	const [row] = await db.select({ value: count() }).from(SSOSession)
	return row?.value ?? 0
}
