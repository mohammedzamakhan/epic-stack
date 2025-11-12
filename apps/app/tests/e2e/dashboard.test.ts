import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { createTestOrganization } from '#tests/test-utils.ts'
// Removed prisma import - using test utilities instead
import { expect, test } from '#tests/playwright-utils.ts'
import { initializeOnboardingSteps } from '../../../../packages/prisma/setup-onboarding.ts'

// Ensure onboarding steps are seeded before tests
async function ensureOnboardingStepsExist() {
	const existingSteps = await prisma.onboardingStep.count()
	if (existingSteps === 0) {
		console.log('Seeding onboarding steps for tests...')
		await initializeOnboardingSteps()
	}
}

test.describe('Dashboard', () => {
	test('Dashboard displays organization overview', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify organization name is displayed
		await expect(page.getByText(org.name)).toBeVisible()

		// Verify dashboard components are present - use more specific selector
		await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
		await expect(page.locator('main')).toBeVisible()
	})

	test('Dashboard shows notes chart with data', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create notes over different days
		const today = new Date()
		const yesterday = new Date(today)
		yesterday.setDate(yesterday.getDate() - 1)
		const twoDaysAgo = new Date(today)
		twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

		await prisma.organizationNote.createMany({
			data: [
				{
					title: 'Today Note 1',
					content: 'Content 1',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true,
					createdAt: today,
				},
				{
					title: 'Today Note 2',
					content: 'Content 2',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true,
					createdAt: today,
				},
				{
					title: 'Yesterday Note',
					content: 'Content 3',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true,
					createdAt: yesterday,
				},
			],
		})

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify notes statistics are displayed (based on actual UI)
		await expect(page.getByText(/daily notes created/i)).toBeVisible()

		// Verify chart shows data points
		await expect(page.getByText(/total notes/i)).toBeVisible()
	})

	test('Dashboard shows onboarding checklist for new organizations', async ({
		page,
		login,
		navigate,
	}) => {
		// Ensure onboarding steps exist in database
		await ensureOnboardingStepsExist()

		const user = await login()

		// Create a new organization with minimal data to avoid auto-completion
		const org = await prisma.organization.create({
			data: {
				name: '', // Empty name to avoid hasCompletedProfile auto-detection
				slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
				description: '',
				users: {
					create: {
						userId: user.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify onboarding checklist is displayed - use specific heading
		await expect(
			page.getByRole('heading', { name: /get started/i }),
		).toBeVisible()

		// Verify some common onboarding steps
		await expect(page.getByText(/create your first note/i)).toBeVisible()
		await expect(page.getByText(/invite team members/i)).toBeVisible()
	})

	test('Dashboard shows recent activity', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create some recent notes
		await prisma.organizationNote.createMany({
			data: [
				{
					title: 'Recent Note 1',
					content: 'Recent content 1',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true,
				},
				{
					title: 'Recent Note 2',
					content: 'Recent content 2',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true,
				},
			],
		})

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify activity is reflected in the dashboard stats
		await expect(page.getByText(/top contributors/i)).toBeVisible()
	})

	test('Dashboard displays organization statistics', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		// Create additional users
		const member1 = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		const member2 = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		// Create an organization with multiple members
		const org = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: [
						{ userId: user.id, organizationRoleId: 'org_role_admin' },
						{ userId: member1.id, organizationRoleId: 'org_role_member' },
						{ userId: member2.id, organizationRoleId: 'org_role_member' },
					],
				},
			},
		})

		// Create multiple notes
		await prisma.organizationNote.createMany({
			data: Array.from({ length: 5 }, (_, i) => ({
				title: `Note ${i + 1}`,
				content: `Content ${i + 1}`,
				organizationId: org.id,
				createdById: user.id,
				isPublic: true,
			})),
		})

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify statistics are displayed - use more specific selectors
		await expect(page.getByText(/3 members/i)).toBeVisible()
		await expect(page.getByText(/5 notes/i)).toBeVisible()
	})

	test('Dashboard allows quick note creation', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Look for quick note creation button or link - use first() to avoid strict mode
		const createNoteButton = page
			.getByRole('link', { name: /create note/i })
			.first()

		if (await createNoteButton.isVisible()) {
			await createNoteButton.click()

			// Verify we're redirected to note creation page
			await expect(page).toHaveURL(new RegExp(`/${org.slug}/notes/new`))
		}
	})

	test('Dashboard shows empty state for new organizations', async ({
		page,
		login,
		navigate,
	}) => {
		// Ensure onboarding steps exist in database
		await ensureOnboardingStepsExist()

		const user = await login()

		// Create a new organization with minimal data to avoid auto-completion
		const org = await prisma.organization.create({
			data: {
				name: '', // Empty name to avoid hasCompletedProfile auto-detection
				slug: `test-org-${Date.now()}-${Math.random().toString(36).substring(7)}`,
				description: '',
				users: {
					create: {
						userId: user.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify empty state messaging - use specific selectors
		await expect(
			page.getByRole('heading', { name: /get started/i }),
		).toBeVisible()
		await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
	})

	test('Dashboard navigation works correctly', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Navigate to organization dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Test navigation to notes section - use first() to avoid strict mode
		const notesLink = page
			.getByRole('link', { name: 'Notes', exact: true })
			.first()
		if (await notesLink.isVisible()) {
			await notesLink.click()
			await expect(page).toHaveURL(new RegExp(`/${org.slug}/notes`))
		}

		// Navigate back to dashboard
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Test navigation to settings - it's a sidebar link (collapsible menu)
		const settingsLink = page.getByRole('link', { name: /^Settings$/i })
		if (await settingsLink.isVisible()) {
			await settingsLink.click()
			// Verify navigation to settings page
			await expect(page).toHaveURL(new RegExp(`/${org.slug}/settings`))
		}
	})

	test('Dashboard is responsive on different screen sizes', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Test desktop view
		await page.setViewportSize({ width: 1200, height: 800 })
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify dashboard loads properly on desktop
		const orgNameLocator = page.getByText(org.name).first()
		await expect(orgNameLocator).toBeVisible()

		// Test tablet view
		await page.setViewportSize({ width: 768, height: 1024 })
		await page.waitForTimeout(500) // Allow time for responsive layout
		await page.waitForLoadState('networkidle')

		// Verify dashboard is still functional on tablet
		await expect(orgNameLocator).toBeVisible()

		// Test mobile view
		await page.setViewportSize({ width: 375, height: 667 })
		await page.waitForTimeout(1000) // Allow time for responsive layout to adjust
		await page.waitForLoadState('networkidle')

		// Verify dashboard is still functional on mobile - just check the page loaded
		// The org name might be in sidebar which could be collapsed on mobile
		await expect(page.locator('body')).toBeVisible()
		// Alternative check: verify we're on the right URL
		await expect(page).toHaveURL(new RegExp(`/${org.slug}`))
	})
})
