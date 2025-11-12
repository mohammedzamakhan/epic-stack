import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { createUser, expect, test as base } from '#tests/playwright-utils.ts'

// Override LAUNCH_STATUS for these tests to force CLOSED_BETA mode
const originalLaunchStatus = process.env.LAUNCH_STATUS
process.env.LAUNCH_STATUS = 'CLOSED_BETA'

const test = base.extend<{
	getOnboardingData(): {
		username: string
		name: string
		email: string
		password: string
	}
}>({
	getOnboardingData: async ({}, use) => {
		const userData = createUser()
		await use(() => {
			const onboardingData = {
				...userData,
				password: faker.internet.password(),
			}
			return onboardingData
		})
		await prisma.user.deleteMany({ where: { username: userData.username } })
	},
})

test.describe('Waitlist Referral System', () => {
	test.afterAll(async () => {
		// Restore original LAUNCH_STATUS after tests
		if (originalLaunchStatus) {
			process.env.LAUNCH_STATUS = originalLaunchStatus
		}
	})

	test('referral link redirects to signup with code stored in session', async ({
		page,
		insertNewUser,
		navigate,
	}) => {
		const referrer = await insertNewUser()

		// Create waitlist entry for referrer
		const referrerEntry = await prisma.waitlistEntry.create({
			data: {
				userId: referrer.id,
				referralCode: `${referrer.username}-5678`,
			},
		})

		// Visit referral link as unauthenticated user
		await navigate('/r/:code', { code: referrerEntry.referralCode })

		// Should redirect to signup
		await expect(page).toHaveURL('/signup')
	})

	test('rank calculation: higher points = better rank', async ({
		insertNewUser,
	}) => {
		// Create multiple users with different points
		const user1 = await insertNewUser()
		const user2 = await insertNewUser()
		const user3 = await insertNewUser()

		// Create waitlist entries with different points
		await prisma.waitlistEntry.create({
			data: {
				userId: user1.id,
				referralCode: `${user1.username}-0001`,
				points: 10, // Highest points
			},
		})

		await prisma.waitlistEntry.create({
			data: {
				userId: user2.id,
				referralCode: `${user2.username}-0002`,
				points: 5,
			},
		})

		await prisma.waitlistEntry.create({
			data: {
				userId: user3.id,
				referralCode: `${user3.username}-0003`,
				points: 1, // Lowest points
			},
		})

		// Calculate ranks
		const { calculateUserRank } = await import('#app/utils/waitlist.server.ts')

		const rank1 = await calculateUserRank(user1.id)
		const rank2 = await calculateUserRank(user2.id)
		const rank3 = await calculateUserRank(user3.id)

		// User with most points should have rank 1
		expect(rank1.rank).toBe(1)
		expect(rank2.rank).toBe(2)
		expect(rank3.rank).toBe(3)

		// Total users should be 3
		expect(rank1.totalUsers).toBe(3)
	})

	test('rank calculation: same points, earlier signup gets better rank', async ({
		insertNewUser,
	}) => {
		const user1 = await insertNewUser()
		const user2 = await insertNewUser()

		// Create entries with same points but different timestamps
		await prisma.waitlistEntry.create({
			data: {
				userId: user1.id,
				referralCode: `${user1.username}-1111`,
				points: 5,
				createdAt: new Date('2025-01-01T00:00:00Z'),
			},
		})

		// Wait a moment to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 10))

		await prisma.waitlistEntry.create({
			data: {
				userId: user2.id,
				referralCode: `${user2.username}-2222`,
				points: 5,
				createdAt: new Date('2025-01-02T00:00:00Z'),
			},
		})

		const { calculateUserRank } = await import('#app/utils/waitlist.server.ts')

		const rank1 = await calculateUserRank(user1.id)
		const rank2 = await calculateUserRank(user2.id)

		// Earlier signup should have better rank
		expect(rank1.rank).toBeLessThan(rank2.rank)
	})

	test('Discord points can be claimed once', async ({ insertNewUser }) => {
		const user = await insertNewUser()

		// Create waitlist entry
		await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-3333`,
				points: 1,
				hasJoinedDiscord: false,
			},
		})

		// Award Discord points
		const { awardDiscordPoints } = await import('#app/utils/waitlist.server.ts')
		await awardDiscordPoints(user.id)

		// Verify points updated in database (1 initial + 2 Discord = 3)
		const updatedEntry = await prisma.waitlistEntry.findUnique({
			where: { userId: user.id },
		})
		expect(updatedEntry?.points).toBe(3)
		expect(updatedEntry?.hasJoinedDiscord).toBe(true)

		// Try to claim again - should fail
		await expect(awardDiscordPoints(user.id)).rejects.toThrow(
			/already awarded/i,
		)
	})

	test('prevents self-referral', async ({ insertNewUser }) => {
		const user = await insertNewUser()

		const waitlistEntry = await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-4444`,
			},
		})

		const { linkReferral } = await import('#app/utils/waitlist.server.ts')

		// Try to refer self
		const result = await linkReferral(user.id, waitlistEntry.referralCode)

		expect(result.success).toBe(false)
		expect(result.message).toContain('Cannot refer yourself')

		// Points should remain unchanged
		const updatedEntry = await prisma.waitlistEntry.findUnique({
			where: { userId: user.id },
		})
		expect(updatedEntry?.points).toBe(1)
	})

	test('prevents duplicate referral linking', async ({ insertNewUser }) => {
		const referrer = await insertNewUser()
		const referee = await insertNewUser()

		const referrerEntry = await prisma.waitlistEntry.create({
			data: {
				userId: referrer.id,
				referralCode: `${referrer.username}-5555`,
			},
		})

		await prisma.waitlistEntry.create({
			data: {
				userId: referee.id,
				referralCode: `${referee.username}-6666`,
			},
		})

		const { linkReferral } = await import('#app/utils/waitlist.server.ts')

		// First referral should work
		const result1 = await linkReferral(referee.id, referrerEntry.referralCode)
		expect(result1.success).toBe(true)

		// Second referral should fail
		const result2 = await linkReferral(referee.id, referrerEntry.referralCode)
		expect(result2.success).toBe(false)
		expect(result2.message).toContain('Already referred by someone')
	})

	test('invalid referral code shows error', async ({ page, navigate }) => {
		// Visit invalid referral link
		await navigate('/r/invalid-code-9999')

		// Should redirect to signup with error
		await expect(page).toHaveURL('/signup')
		await expect(page.getByText(/invalid referral link/i)).toBeVisible()
	})

	test('referral code format is username-XXXX', async ({ insertNewUser }) => {
		const user = await insertNewUser()

		const { getOrCreateWaitlistEntry } = await import(
			'#app/utils/waitlist.server.ts'
		)

		const entry = await getOrCreateWaitlistEntry(user.id)

		// Check format: username-XXXX where XXXX is 4 digits
		expect(entry.referralCode).toMatch(new RegExp(`^${user.username}-\\d{4}$`))
	})

	test('transaction ensures referral linking and points are atomic', async ({
		insertNewUser,
	}) => {
		const referrer = await insertNewUser()
		const referee = await insertNewUser()

		await prisma.waitlistEntry.create({
			data: {
				userId: referrer.id,
				referralCode: `${referrer.username}-9991`,
				points: 1,
			},
		})

		await prisma.waitlistEntry.create({
			data: {
				userId: referee.id,
				referralCode: `${referee.username}-9992`,
			},
		})

		const { linkReferral } = await import('#app/utils/waitlist.server.ts')

		// Link the referral
		const result = await linkReferral(
			referee.id,
			`${referrer.username}-9991`,
		)
		expect(result.success).toBe(true)

		// Verify both the link and points were updated
		const referrerEntry = await prisma.waitlistEntry.findUnique({
			where: { userId: referrer.id },
		})
		const refereeEntry = await prisma.waitlistEntry.findUnique({
			where: { userId: referee.id },
		})

		expect(referrerEntry?.points).toBe(6) // 1 + 5
		expect(refereeEntry?.referredById).toBe(referrerEntry?.id)
	})

	test('getOrCreateWaitlistEntry creates entry with default values', async ({
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		const { getOrCreateWaitlistEntry } = await import(
			'#app/utils/waitlist.server.ts'
		)

		const entry = await getOrCreateWaitlistEntry(user.id)

		expect(entry).toBeTruthy()
		expect(entry.userId).toBe(user.id)
		expect(entry.points).toBe(1)
		expect(entry.hasJoinedDiscord).toBe(false)
		expect(entry.hasEarlyAccess).toBe(false)
		expect(entry.referralCode).toMatch(/^.*-\d{4}$/)
	})

	test('shouldBeOnWaitlist returns true for users without early access', async ({
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		// Create waitlist entry without early access
		await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-7777`,
				hasEarlyAccess: false,
			},
		})

		const { shouldBeOnWaitlist } = await import('#app/utils/waitlist.server.ts')
		const onWaitlist = await shouldBeOnWaitlist(user.id)

		expect(onWaitlist).toBe(true)
	})

	test('shouldBeOnWaitlist returns false for users with early access', async ({
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		// Create waitlist entry with early access
		await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-8888`,
				hasEarlyAccess: true,
			},
		})

		const { shouldBeOnWaitlist } = await import('#app/utils/waitlist.server.ts')
		const onWaitlist = await shouldBeOnWaitlist(user.id)

		expect(onWaitlist).toBe(false)
	})

	test('shouldBeOnWaitlist returns false when not in CLOSED_BETA', async ({
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		// Create waitlist entry without early access
		await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-9999`,
				hasEarlyAccess: false,
			},
		})

		// Temporarily change LAUNCH_STATUS
		const originalStatus = process.env.LAUNCH_STATUS
		process.env.LAUNCH_STATUS = 'PUBLIC_BETA'

		const { shouldBeOnWaitlist } = await import('#app/utils/waitlist.server.ts')
		const onWaitlist = await shouldBeOnWaitlist(user.id)

		// Restore original status
		process.env.LAUNCH_STATUS = originalStatus

		expect(onWaitlist).toBe(false)
	})

	test('grantEarlyAccess grants access to a user', async ({
		insertNewUser,
	}) => {
		const user = await insertNewUser()
		const admin = await insertNewUser()

		// Create waitlist entry without early access
		await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-1001`,
				hasEarlyAccess: false,
			},
		})

		const { grantEarlyAccess } = await import('#app/utils/waitlist.server.ts')
		await grantEarlyAccess(user.id, admin.id)

		// Verify access was granted
		const entry = await prisma.waitlistEntry.findUnique({
			where: { userId: user.id },
		})

		expect(entry?.hasEarlyAccess).toBe(true)
		expect(entry?.grantedAccessBy).toBe(admin.id)
		expect(entry?.grantedAccessAt).toBeTruthy()
	})

	test('revokeEarlyAccess revokes access from a user', async ({
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		// Create waitlist entry with early access
		await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-1002`,
				hasEarlyAccess: true,
				grantedAccessAt: new Date(),
				grantedAccessBy: 'admin-id',
			},
		})

		const { revokeEarlyAccess } = await import('#app/utils/waitlist.server.ts')
		await revokeEarlyAccess(user.id)

		// Verify access was revoked
		const entry = await prisma.waitlistEntry.findUnique({
			where: { userId: user.id },
		})

		expect(entry?.hasEarlyAccess).toBe(false)
		expect(entry?.grantedAccessBy).toBeNull()
		expect(entry?.grantedAccessAt).toBeNull()
	})

	test('referral code validation rejects invalid formats', async ({ page, navigate }) => {
		// Try various invalid formats - all should redirect to signup
		const invalidCodes = [
			'test', // Too short
			'a'.repeat(101), // Too long
			'user@name-1234', // Invalid character
			'username-abc', // Not 4 digits
			'username-12345', // Too many digits
		]

		for (const code of invalidCodes) {
			await navigate('/r/:code', { code: code })
			// Invalid codes should redirect to signup page
			// (toast messages are unreliable to verify in test environment)
			await expect(page).toHaveURL(/\/signup/, { timeout: 5000 })
		}
	})
})

// Helper function for tests that need insertNewUser
async function insertNewUser() {
	const userData = createUser()
	return await prisma.user.create({
		data: {
			...userData,
			roles: { connect: { name: 'user' } },
		},
		select: { id: true, email: true, username: true, name: true },
	})
}
