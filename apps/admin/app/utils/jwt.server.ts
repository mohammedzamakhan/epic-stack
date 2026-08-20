import { RefreshToken, db, and, eq } from '@repo/database'

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
	await db
		.update(RefreshToken)
		.set({ revoked: true })
		.where(
			and(eq(RefreshToken.userId, userId), eq(RefreshToken.revoked, false)),
		)
}
