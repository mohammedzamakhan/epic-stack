import { prisma } from '@repo/database'

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
	await prisma.refreshToken.updateMany({
		where: { userId, revoked: false },
		data: { revoked: true },
	})
}
