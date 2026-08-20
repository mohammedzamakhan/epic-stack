import { expect } from '@playwright/test'
import { Role, User, _RoleToUser, db, eq } from '@repo/database'
import { test } from '#tests/playwright-utils.ts'

test.describe('Admin Impersonation', () => {
	test('admin can impersonate a user', async ({
		page,
		insertNewUser,
		navigate,
	}) => {
		// Create an admin user
		const adminUser = await insertNewUser({ username: 'admin-test' })
		const [adminRole] = await db
			.select({ id: Role.id })
			.from(Role)
			.where(eq(Role.name, 'admin'))
			.limit(1)
		if (!adminRole) throw new Error('Admin role not found')
		await db.insert(_RoleToUser).values({ A: adminRole.id, B: adminUser.id })

		// Create a regular user to impersonate
		const targetUser = await insertNewUser({ username: 'target-user' })

		// Login as admin
		await navigate('/login')
		await page.fill('[name="username"]', adminUser.username)
		await page.fill('[name="password"]', 'password')
		await page.click('[type="submit"]')

		// Navigate to admin users page
		await navigate('/admin/users')
		await expect(page).toHaveURL('/admin/users')

		// Find and click on the target user
		await page.click(`[href="/admin/users/${targetUser.id}"]`)
		await expect(page).toHaveURL(`/admin/users/${targetUser.id}`)

		// Click impersonate button
		await page.click('button:has-text("Impersonate")')

		// Should be redirected to main app as the impersonated user
		await expect(page).toHaveURL('/')

		// Should see impersonation banner
		await expect(page.locator('text=Admin Impersonation Active')).toBeVisible()
		await expect(
			page.locator(
				`text=You are impersonating ${targetUser.name || targetUser.username}`,
			),
		).toBeVisible()

		// Should be able to stop impersonation
		await page.click('button:has-text("Stop Impersonation")')
		await expect(page).toHaveURL('/admin/users')
		await expect(
			page.locator('text=Admin Impersonation Active'),
		).not.toBeVisible()
	})

	test('non-admin cannot access impersonation routes', async ({
		page,
		insertNewUser,
		navigate,
	}) => {
		// Create a regular user
		const regularUser = await insertNewUser({ username: 'regular-user' })
		const targetUser = await insertNewUser({ username: 'target-user' })

		// Login as regular user
		await navigate('/login')
		await page.fill('[name="username"]', regularUser.username)
		await page.fill('[name="password"]', 'password')
		await page.click('[type="submit"]')

		// Try to access impersonation route directly
		const response = await navigate('/admin/users/:userId/impersonate', {
			userId: targetUser.id,
		})

		// Should get 403 or be redirected
		expect(response?.status()).toBe(403)
	})

	test('cannot impersonate banned user', async ({
		page,
		insertNewUser,
		navigate,
	}) => {
		// Create an admin user
		const adminUser = await insertNewUser({ username: 'admin-test' })
		const [adminRole] = await db
			.select({ id: Role.id })
			.from(Role)
			.where(eq(Role.name, 'admin'))
			.limit(1)
		if (!adminRole) throw new Error('Admin role not found')
		await db.insert(_RoleToUser).values({ A: adminRole.id, B: adminUser.id })

		// Create a banned user
		const bannedUser = await insertNewUser({ username: 'banned-user' })
		await db
			.update(User)
			.set({
				isBanned: true,
				banReason: 'Test ban',
				bannedAt: new Date(),
			})
			.where(eq(User.id, bannedUser.id))

		// Login as admin
		await navigate('/login')
		await page.fill('[name="username"]', adminUser.username)
		await page.fill('[name="password"]', 'password')
		await page.click('[type="submit"]')

		// Navigate to banned user's page
		await navigate('/admin/users/:userId', { userId: bannedUser.id })

		// Impersonate button should be disabled
		const impersonateButton = page.locator('button:has-text("Impersonate")')
		await expect(impersonateButton).toBeDisabled()
	})
})
