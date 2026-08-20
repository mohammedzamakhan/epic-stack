import { and, ConfigFlag, db, eq } from '@repo/database'

async function getFlag(
	key: string,
	level: 'system' | 'organization' | 'user',
	organizationId?: string,
	userId?: string,
) {
	const conditions = [
		eq(ConfigFlag.key, key),
		eq(ConfigFlag.level, level),
		level === 'organization'
			? eq(ConfigFlag.organizationId, organizationId!)
			: undefined,
		level === 'user' ? eq(ConfigFlag.userId, userId!) : undefined,
	].filter(Boolean)
	const [flag] = await db
		.select({ value: ConfigFlag.value })
		.from(ConfigFlag)
		.where(and(...conditions))
	if (!flag) return null

	return flag.value
}

export async function getFeatureFlag(
	key: string,
	{ organizationId, userId }: { organizationId?: string; userId?: string },
) {
	if (userId) {
		const userFlag = await getFlag(key, 'user', organizationId, userId)
		if (userFlag !== null) return userFlag
	}

	if (organizationId) {
		const orgFlag = await getFlag(key, 'organization', organizationId)
		if (orgFlag !== null) return orgFlag
	}

	const systemFlag = await getFlag(key, 'system')
	return systemFlag
}
