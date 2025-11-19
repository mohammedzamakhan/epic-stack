import { getFeatureFlag as _getFeatureFlag } from '@repo/common/feature-flags'
import { prisma } from '@repo/database'

export async function getFeatureFlag(
	key: string,
	{ organizationId, userId }: { organizationId?: string; userId?: string },
) {
	return _getFeatureFlag(prisma, key, { organizationId, userId })
}
