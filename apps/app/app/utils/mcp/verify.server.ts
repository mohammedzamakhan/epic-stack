import { hashApiKey } from '@repo/security'
import { prisma } from '@repo/database'
import { auditService, AuditAction } from '@repo/audit'

export async function verifyApiKey(key: string) {
    const hashedKey = hashApiKey(key)
    const apiKey = await prisma.apiKey.findUnique({
        where: { hashedKey }, include: { user: true, organization: true }
    })

    if (!apiKey) return null

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

    // Update last used at
    await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
    })

    await auditService.log({
        action: AuditAction.API_KEY_USED,
        userId: apiKey.userId,
        organizationId: apiKey.organizationId,
        metadata: { apiKeyId: apiKey.id }, details: 'API Key Used for MCP Request'
    })

    return apiKey
}
