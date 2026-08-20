import {
	and,
	count,
	db,
	eq,
	gt,
	Password,
	Session,
	User,
	UserImage,
	Verification,
} from '@repo/database'

/**
 * Shared user select structure for security-related queries
 * Used across security and profile routes
 */
export function getUserSecuritySelect() {
	return {
		id: User.id,
		name: User.name,
		username: User.username,
		email: User.email,
		objectKey: UserImage.objectKey,
	} as const
}

/**
 * Get user security data including user info, 2FA status, and password status
 * @param userId - The user ID to fetch data for
 * @param twoFAVerificationType - The 2FA verification type constant
 */
export async function getUserSecurityData(
	userId: string,
	twoFAVerificationType: string,
) {
	const [user] = await db
		.select(getUserSecuritySelect())
		.from(User)
		.leftJoin(UserImage, eq(UserImage.userId, User.id))
		.where(eq(User.id, userId))
		.limit(1)
	if (!user) throw new Error('User not found')
	const [sessionCount] = await db
		.select({ value: count() })
		.from(Session)
		.where(
			and(eq(Session.userId, userId), gt(Session.expirationDate, new Date())),
		)

	const [twoFactorVerification] = await db
		.select({ id: Verification.id })
		.from(Verification)
		.where(
			and(
				eq(Verification.type, twoFAVerificationType),
				eq(Verification.target, userId),
			),
		)
		.limit(1)

	const [password] = await db
		.select({ userId: Password.userId })
		.from(Password)
		.where(eq(Password.userId, userId))
		.limit(1)

	return {
		user: { ...user, sessionCount: sessionCount?.value ?? 0 },
		twoFactorVerification,
		password,
	}
}
