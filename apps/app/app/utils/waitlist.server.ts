import { prisma } from '#app/utils/db.server.ts'

const REFERRAL_POINTS = 5
const DISCORD_POINTS = 2

/**
 * Generate a unique referral code for a user
 * Format: username-random4digits
 */
export async function generateReferralCode(username: string): Promise<string> {
	let referralCode: string
	let isUnique = false

	while (!isUnique) {
		const randomDigits = Math.floor(1000 + Math.random() * 9000)
		referralCode = `${username}-${randomDigits}`

		const existing = await prisma.waitlistEntry.findUnique({
			where: { referralCode },
		})

		if (!existing) {
			isUnique = true
		}
	}

	return referralCode!
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
 */
export async function awardDiscordPoints(userId: string) {
	const waitlistEntry = await prisma.waitlistEntry.findUnique({
		where: { userId },
	})

	if (!waitlistEntry) {
		throw new Error('Waitlist entry not found')
	}

	if (waitlistEntry.hasJoinedDiscord) {
		throw new Error('Discord points already awarded')
	}

	await prisma.waitlistEntry.update({
		where: { userId },
		data: {
			hasJoinedDiscord: true,
			points: {
				increment: DISCORD_POINTS,
			},
		},
	})
}

/**
 * Link a user to their referrer by referral code
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

	// Link the referral and award points
	await prisma.waitlistEntry.update({
		where: { userId },
		data: {
			referredById: referrerEntry.id,
		},
	})

	await awardReferralPoints(referrerEntry.userId)

	return { success: true, message: 'Referral linked successfully' }
}
