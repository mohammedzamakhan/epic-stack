import { prisma } from '@repo/database'

/**
 * Shared user select structure for security-related queries
 * Used across security and profile routes
 */
export const userSecuritySelect = {
	id: true,
	name: true,
	username: true,
	email: true,
	image: {
		select: { objectKey: true },
	},
	_count: {
		select: {
			sessions: {
				where: {
					expirationDate: { gt: new Date() },
				},
			},
		},
	},
} as const

/**
 * Get user security data including user info, 2FA status, and password status
 * @param userId - The user ID to fetch data for
 * @param twoFAVerificationType - The 2FA verification type constant
 */
export async function getUserSecurityData(
	userId: string,
	twoFAVerificationType: string,
) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: userSecuritySelect,
	})

	const twoFactorVerification = await prisma.verification.findUnique({
		select: { id: true },
		where: { target_type: { type: twoFAVerificationType, target: userId } },
	})

	const password = await prisma.password.findUnique({
		select: { userId: true },
		where: { userId },
	})

	return {
		user,
		twoFactorVerification,
		password,
	}
}
