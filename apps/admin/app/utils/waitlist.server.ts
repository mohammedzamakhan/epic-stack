import { prisma } from '#app/utils/db.server.ts'

/**
 * Grant early access to a user on the waitlist
 */
export async function grantEarlyAccess(
	userId: string,
	grantedBy: string,
): Promise<void> {
	await prisma.waitlistEntry.update({
		where: { userId },
		data: {
			hasEarlyAccess: true,
			grantedAccessAt: new Date(),
			grantedAccessBy: grantedBy,
		},
	})
}

/**
 * Revoke early access from a user
 */
export async function revokeEarlyAccess(userId: string): Promise<void> {
	await prisma.waitlistEntry.update({
		where: { userId },
		data: {
			hasEarlyAccess: false,
			grantedAccessAt: null,
			grantedAccessBy: null,
		},
	})
}
