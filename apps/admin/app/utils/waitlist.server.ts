import { WaitlistEntry, db, eq } from '@repo/database'

/**
 * Grant early access to a user on the waitlist
 */
export async function grantEarlyAccess(
	userId: string,
	grantedBy: string,
): Promise<void> {
	await db
		.update(WaitlistEntry)
		.set({
			hasEarlyAccess: true,
			grantedAccessAt: new Date(),
			grantedAccessBy: grantedBy,
		})
		.where(eq(WaitlistEntry.userId, userId))
}

/**
 * Revoke early access from a user
 */
export async function revokeEarlyAccess(userId: string): Promise<void> {
	await db
		.update(WaitlistEntry)
		.set({
			hasEarlyAccess: false,
			grantedAccessAt: null,
			grantedAccessBy: null,
		})
		.where(eq(WaitlistEntry.userId, userId))
}
