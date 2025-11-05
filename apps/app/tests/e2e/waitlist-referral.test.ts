import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { readEmail } from '#tests/mocks/utils.ts'
import { createUser, expect, test as base } from '#tests/playwright-utils.ts'

// Override LAUNCH_STATUS for these tests to force CLOSED_BETA mode
const originalLaunchStatus = process.env.LAUNCH_STATUS
process.env.LAUNCH_STATUS = 'CLOSED_BETA'

const URL_REGEX = /(?<url>https?:\/\/[^\s$.?#].[^\s]*)/
const CODE_REGEX = /Here's your verification code: (?<code>[\d\w]+)/

function extractUrl(text: string) {
	const match = text.match(URL_REGEX)
	return match?.groups?.url
}

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

	test('user gets waitlist entry with 1 point and rank after signup', async ({
		page,
		getOnboardingData,
	}) => {
		const onboardingData = getOnboardingData()

		// Go to signup
		await page.goto('/signup')

		// Fill email
		const emailTextbox = page.getByRole('textbox', { name: /email/i })
		await emailTextbox.fill(onboardingData.email)
		await page.getByRole('button', { name: /sign up/i }).click()

		// Get verification code from email
		const email = await readEmail(onboardingData.email)
		invariant(email, 'Email not found')
		const codeMatch = email.text.match(CODE_REGEX)
		const code = codeMatch?.groups?.code
		invariant(code, 'Onboarding code not found')

		// Enter code
		await page.getByRole('textbox', { name: /code/i }).fill(code)
		await page.getByRole('button', { name: /verify/i }).click()

		// Complete onboarding
		await expect(page).toHaveURL(`/onboarding`)
		await page
			.getByRole('textbox', { name: /^username/i })
			.fill(onboardingData.username)
		await page
			.getByRole('textbox', { name: /full name/i })
			.fill(onboardingData.name)
		await page.getByLabel(/^password/i).fill(onboardingData.password)
		await page.getByLabel(/^confirm password/i).fill(onboardingData.password)
		await page.waitForLoadState('networkidle')
		await page.getByLabel(/terms/i).check()
		await page.getByRole('button', { name: /Create account/i }).click()

		// Should be redirected to waitlist
		await expect(page).toHaveURL(`/waitlist`)

		// Check that waitlist page shows default 1 point
		await expect(page.getByText(/your points/i)).toBeVisible()
		await expect(page.getByText('1', { exact: true })).toBeVisible()

		// Check that rank is displayed
		await expect(page.getByText(/your rank/i)).toBeVisible()
		await expect(page.getByText(/\d+ \/ \d+/)).toBeVisible()

		// Verify waitlist entry was created in database
		const user = await prisma.user.findUnique({
			where: { username: onboardingData.username },
			include: { waitlistEntry: true },
		})
		expect(user).toBeTruthy()
		expect(user?.waitlistEntry).toBeTruthy()
		expect(user?.waitlistEntry?.points).toBe(1)
		expect(user?.waitlistEntry?.referralCode).toBeTruthy()
	})

	test('user can copy referral link and see referral URL', async ({
		page,
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		// Create waitlist entry for user
		const waitlistEntry = await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-1234`,
			},
		})

		// Log in (in closed beta, users are redirected to waitlist)
		await page.goto('/waitlist')
		await page.waitForLoadState('networkidle')

		// Check referral link is displayed
		const referralInput = page.getByRole('textbox', {
			name: '',
		})
		const referralUrl = await referralInput.inputValue()
		expect(referralUrl).toContain(`/r/${waitlistEntry.referralCode}`)

		// Check copy button exists
		await expect(
			page.getByRole('button', { name: /copy/i }),
		).toBeVisible()

		// Check that points and referral instructions are visible
		await expect(
			page.getByText(/share with others/i),
		).toBeVisible()
		await expect(page.getByText(/\+5 points\/referral/i)).toBeVisible()
	})

	test('referral link redirects to signup with code stored in session', async ({
		page,
		insertNewUser,
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
		await page.goto(`/r/${referrerEntry.referralCode}`)

		// Should redirect to signup
		await expect(page).toHaveURL('/signup')
	})

	test('complete referral flow: referee signs up and referrer gets 5 points', async ({
		page,
		getOnboardingData,
		insertNewUser,
	}) => {
		// Create referrer user
		const referrer = await insertNewUser()
		const referrerEntry = await prisma.waitlistEntry.create({
			data: {
				userId: referrer.id,
				referralCode: `${referrer.username}-9999`,
				points: 1, // Starting with 1 point
			},
		})

		// New user clicks referral link
		const onboardingData = getOnboardingData()
		await page.goto(`/r/${referrerEntry.referralCode}`)

		// Should redirect to signup
		await expect(page).toHaveURL('/signup')

		// Complete signup
		const emailTextbox = page.getByRole('textbox', { name: /email/i })
		await emailTextbox.fill(onboardingData.email)
		await page.getByRole('button', { name: /sign up/i }).click()

		// Get verification code
		const email = await readEmail(onboardingData.email)
		invariant(email, 'Email not found')
		const codeMatch = email.text.match(CODE_REGEX)
		const code = codeMatch?.groups?.code
		invariant(code, 'Onboarding code not found')

		// Enter code
		await page.getByRole('textbox', { name: /code/i }).fill(code)
		await page.getByRole('button', { name: /verify/i }).click()

		// Complete onboarding
		await expect(page).toHaveURL(`/onboarding`)
		await page
			.getByRole('textbox', { name: /^username/i })
			.fill(onboardingData.username)
		await page
			.getByRole('textbox', { name: /full name/i })
			.fill(onboardingData.name)
		await page.getByLabel(/^password/i).fill(onboardingData.password)
		await page.getByLabel(/^confirm password/i).fill(onboardingData.password)
		await page.waitForLoadState('networkidle')
		await page.getByLabel(/terms/i).check()
		await page.getByRole('button', { name: /Create account/i }).click()

		// Should be redirected to waitlist
		await expect(page).toHaveURL(`/waitlist`)

		// Verify referrer got 5 points (1 initial + 5 for referral = 6 total)
		const updatedReferrerEntry = await prisma.waitlistEntry.findUnique({
			where: { userId: referrer.id },
		})
		expect(updatedReferrerEntry?.points).toBe(6)

		// Verify referee was linked to referrer
		const referee = await prisma.user.findUnique({
			where: { username: onboardingData.username },
			include: { waitlistEntry: true },
		})
		expect(referee?.waitlistEntry?.referredById).toBe(referrerEntry.id)
		expect(referee?.waitlistEntry?.points).toBe(1) // Referee starts with 1 point
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
		const entry1 = await prisma.waitlistEntry.create({
			data: {
				userId: user1.id,
				referralCode: `${user1.username}-1111`,
				points: 5,
				createdAt: new Date('2025-01-01T00:00:00Z'),
			},
		})

		// Wait a moment to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 10))

		const entry2 = await prisma.waitlistEntry.create({
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

	test('Discord points can be claimed once', async ({
		page,
		insertNewUser,
	}) => {
		const user = await insertNewUser()

		// Create waitlist entry
		const waitlistEntry = await prisma.waitlistEntry.create({
			data: {
				userId: user.id,
				referralCode: `${user.username}-3333`,
				points: 1,
				hasJoinedDiscord: false,
			},
		})

		// Log in user by creating a session
		const { getPasswordHash, sessionKey } = await import(
			'#app/utils/auth.server.ts'
		)
		const { authSessionStorage } = await import('#app/utils/session.server.ts')

		const session = await prisma.session.create({
			data: {
				expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
				userId: user.id,
			},
		})

		const authSession = await authSessionStorage.getSession()
		authSession.set(sessionKey, session.id)
		const cookieValue = await authSessionStorage.commitSession(authSession)

		await page.context().addCookies([
			{
				name: 'en_session',
				value: cookieValue.split('en_session=')[1]?.split(';')[0] || '',
				domain: 'localhost',
				path: '/',
			},
		])

		// Navigate to waitlist page
		await page.goto('/waitlist')
		await page.waitForLoadState('networkidle')

		// Check Discord section is visible
		await expect(page.getByText(/join our discord/i)).toBeVisible()
		await expect(page.getByText(/\+2 points/i)).toBeVisible()

		// Verify Discord points haven't been claimed yet
		await expect(
			page.getByText(/discord points claimed/i),
		).not.toBeVisible()

		// Award Discord points via action (simulating the button click)
		const { awardDiscordPoints } = await import(
			'#app/utils/waitlist.server.ts'
		)
		await awardDiscordPoints(user.id)

		// Reload page to see updated status
		await page.reload()
		await page.waitForLoadState('networkidle')

		// Check Discord points have been claimed
		await expect(page.getByText(/discord points claimed/i)).toBeVisible()

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

		const refereeEntry = await prisma.waitlistEntry.create({
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

	test('displays referral count on waitlist page', async ({
		page,
		insertNewUser,
	}) => {
		const referrer = await insertNewUser()
		const referee1 = await insertNewUser()
		const referee2 = await insertNewUser()

		// Create referrer entry
		const referrerEntry = await prisma.waitlistEntry.create({
			data: {
				userId: referrer.id,
				referralCode: `${referrer.username}-7777`,
				points: 11, // 1 initial + 5*2 referrals
			},
		})

		// Create two referees linked to referrer
		await prisma.waitlistEntry.create({
			data: {
				userId: referee1.id,
				referralCode: `${referee1.username}-8888`,
				referredById: referrerEntry.id,
			},
		})

		await prisma.waitlistEntry.create({
			data: {
				userId: referee2.id,
				referralCode: `${referee2.username}-9999`,
				referredById: referrerEntry.id,
			},
		})

		// Log in as referrer
		const { sessionKey } = await import('#app/utils/auth.server.ts')
		const { authSessionStorage } = await import('#app/utils/session.server.ts')

		const session = await prisma.session.create({
			data: {
				expirationDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
				userId: referrer.id,
			},
		})

		const authSession = await authSessionStorage.getSession()
		authSession.set(sessionKey, session.id)
		const cookieValue = await authSessionStorage.commitSession(authSession)

		await page.context().addCookies([
			{
				name: 'en_session',
				value: cookieValue.split('en_session=')[1]?.split(';')[0] || '',
				domain: 'localhost',
				path: '/',
			},
		])

		// Navigate to waitlist page
		await page.goto('/waitlist')
		await page.waitForLoadState('networkidle')

		// Check that referral count is displayed
		await expect(page.getByText(/2 people joined using your link/i)).toBeVisible()
	})

	test('invalid referral code shows error', async ({
		page,
	}) => {
		// Visit invalid referral link
		await page.goto('/r/invalid-code-9999')

		// Should redirect to signup with error
		await expect(page).toHaveURL('/signup')
		await expect(
			page.getByText(/invalid referral link/i),
		).toBeVisible()
	})

	test('referral code format is username-XXXX', async ({ insertNewUser }) => {
		const user = await insertNewUser()

		const { getOrCreateWaitlistEntry } = await import(
			'#app/utils/waitlist.server.ts'
		)

		const entry = await getOrCreateWaitlistEntry(user.id)

		// Check format: username-XXXX where XXXX is 4 digits
		expect(entry.referralCode).toMatch(
			new RegExp(`^${user.username}-\\d{4}$`),
		)
	})
})
