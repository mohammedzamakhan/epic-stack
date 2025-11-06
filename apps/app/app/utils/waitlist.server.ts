import { randomInt } from 'node:crypto'
import { prisma } from '#app/utils/db.server.ts'
import { getLaunchStatus } from './env.server.ts'

const REFERRAL_POINTS = 5
const DISCORD_POINTS = 2

/**
 * Generate a unique referral code for a user
 * Format: username-random4digits
 * Uses cryptographically secure random number generation
 */
export async function generateReferralCode(username: string): Promise<string> {
	let referralCode = ''
	let isUnique = false

	while (!isUnique) {
		// Use crypto.randomInt for cryptographically secure random generation
		const randomDigits = randomInt(1000, 10000)
		referralCode = `${username}-${randomDigits}`

		const existing = await prisma.waitlistEntry.findUnique({
			where: { referralCode },
		})

		if (!existing) {
			isUnique = true
		}
	}

	return referralCode
}

/**
 * Get or create a waitlist entry for a user
 */
export async function getOrCreateWaitlistEntry(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { username: true },
	})

	if (!user) {
		throw new Error('User not found')
	}

	let waitlistEntry = await prisma.waitlistEntry.findUnique({
		where: { userId },
		include: {
			referredBy: true,
			referrals: true,
		},
	})

	if (!waitlistEntry) {
		const referralCode = await generateReferralCode(user.username)
		waitlistEntry = await prisma.waitlistEntry.create({
			data: {
				userId,
				referralCode,
			},
			include: {
				referredBy: true,
				referrals: true,
			},
		})
	}

	return waitlistEntry
}

/**
 * Calculate the rank of a user on the waitlist
 * Higher points = better rank
 * If points are equal, earlier createdAt = better rank
 */
export async function calculateUserRank(
	userId: string,
): Promise<{ rank: number; totalUsers: number }> {
	const waitlistEntry = await prisma.waitlistEntry.findUnique({
		where: { userId },
	})

	if (!waitlistEntry) {
		throw new Error('Waitlist entry not found')
	}

	// Count users with higher points or same points but earlier createdAt
	const rank = await prisma.waitlistEntry.count({
		where: {
			OR: [
				{ points: { gt: waitlistEntry.points } },
				{
					points: waitlistEntry.points,
					createdAt: { lt: waitlistEntry.createdAt },
				},
			],
		},
	})

	const totalUsers = await prisma.waitlistEntry.count()

	return {
		rank: rank + 1, // +1 because ranks start at 1, not 0
		totalUsers,
	}
}

/**
 * Award points for a referral
 */
export async function awardReferralPoints(referrerId: string) {
	const waitlistEntry = await prisma.waitlistEntry.findUnique({
		where: { userId: referrerId },
	})

	if (!waitlistEntry) {
		throw new Error('Referrer waitlist entry not found')
	}

	await prisma.waitlistEntry.update({
		where: { userId: referrerId },
		data: {
			points: {
				increment: REFERRAL_POINTS,
			},
		},
	})
}

/**
 * Award points for joining Discord
 * Uses atomic update to prevent race conditions
 */
export async function awardDiscordPoints(userId: string) {
	// Use updateMany with a condition to make this atomic and prevent race conditions
	// Only updates if hasJoinedDiscord is still false
	const result = await prisma.waitlistEntry.updateMany({
		where: {
			userId,
			hasJoinedDiscord: false, // Only update if still false
		},
		data: {
			hasJoinedDiscord: true,
			points: {
				increment: DISCORD_POINTS,
			},
		},
	})

	// If no rows were updated, either the entry doesn't exist or points were already awarded
	if (result.count === 0) {
		const entry = await prisma.waitlistEntry.findUnique({
			where: { userId },
		})

		if (!entry) {
			throw new Error('Waitlist entry not found')
		}

		throw new Error('Discord points already awarded')
	}
}

/**
 * Link a user to their referrer by referral code
 * Uses a transaction to ensure atomicity between linking and awarding points
 */
export async function linkReferral(userId: string, referralCode: string) {
	const referrerEntry = await prisma.waitlistEntry.findUnique({
		where: { referralCode },
	})

	if (!referrerEntry) {
		return { success: false, message: 'Invalid referral code' }
	}

	// Check if user is trying to refer themselves
	if (referrerEntry.userId === userId) {
		return { success: false, message: 'Cannot refer yourself' }
	}

	// Check if user already has a referrer
	const userEntry = await prisma.waitlistEntry.findUnique({
		where: { userId },
	})

	if (userEntry && userEntry.referredById) {
		return { success: false, message: 'Already referred by someone' }
	}

	// Link the referral and award points atomically in a transaction
	// This prevents race conditions where the link succeeds but points fail
	await prisma.$transaction(async (tx) => {
		await tx.waitlistEntry.update({
			where: { userId },
			data: {
				referredById: referrerEntry.id,
			},
		})

		await tx.waitlistEntry.update({
			where: { userId: referrerEntry.userId },
			data: {
				points: {
					increment: REFERRAL_POINTS,
				},
			},
		})
	})

	return { success: true, message: 'Referral linked successfully' }
}

/**
 * Check if a user should be restricted to the waitlist
 * Returns true if the user should be redirected to /waitlist
 */
export async function shouldBeOnWaitlist(userId: string): Promise<boolean> {
	const launchStatus = getLaunchStatus()

	// If not in closed beta, no one should be on waitlist
	if (launchStatus !== 'CLOSED_BETA') {
		return false
	}

	// Check if user has a waitlist entry and if they have early access
	const waitlistEntry = await prisma.waitlistEntry.findUnique({
		where: { userId },
		select: { hasEarlyAccess: true },
	})

	// If no waitlist entry exists, user is on waitlist
	if (!waitlistEntry) {
		return true
	}

	// If user has early access, they shouldn't be on waitlist
	return !waitlistEntry.hasEarlyAccess
}

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
