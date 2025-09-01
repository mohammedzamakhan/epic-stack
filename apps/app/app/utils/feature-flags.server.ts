import { prisma } from '#app/utils/db.server'

async function getFlag(key: string, level: 'system' | 'organization' | 'user', organizationId?: string, userId?: string) {
  const where: any = { key, level }
  if (level === 'organization') where.organizationId = organizationId
  if (level === 'user') where.userId = userId

  const flag = await prisma.configFlag.findFirst({ where })
  if (!flag) return null

  return flag.value
}

export async function getFeatureFlag(key: string, { organizationId, userId }: { organizationId?: string, userId?: string }) {
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
