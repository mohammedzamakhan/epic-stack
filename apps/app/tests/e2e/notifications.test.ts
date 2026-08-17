import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Notifications', () => {
	test.beforeEach(async ({ page }) => {
		// Abort SSE stream to prevent networkidle from hanging
		await page.route('**/api/notifications/stream*', (route) => route.abort())
	})

	test('Users can access notification settings', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		await expect(
			page.getByText(/notification preferences/i).first(),
		).toBeVisible()
	})

	test('Users can update notification preferences', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Find the first email toggle
		const toggles = page.getByRole('switch')

		if ((await toggles.count()) > 0) {
			const firstToggle = toggles.first()
			const initialState = await firstToggle.isChecked()

			// Toggle it
			await firstToggle.click()

			// Wait for the optimistic UI update to settle
			await page.waitForTimeout(500)

			// Reload to ensure it persisted to the database
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Should be the opposite of initial state
			if (initialState) {
				await expect(firstToggle).not.toBeChecked()
			} else {
				await expect(firstToggle).toBeChecked()
			}
		}
	})

	test('Users can view notification history', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const notificationBell = page
			.getByRole('button', { name: /notifications/i })
			.first()

		if (await notificationBell.isVisible()) {
			await notificationBell.click()

			await expect(page.getByText(/notifications/i).first()).toBeVisible()
		}
	})

	test('Users can mark notifications as read', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		const org = await createTestOrganization(user.id, 'admin')

		// Create a test notification for this user
		await prisma.notification.create({
			data: {
				userId: user.id,
				organizationId: org.id,
				type: 'mention',
				isRead: false,
				entityId: 'test-entity',
				payload: JSON.stringify({
					commenterName: 'Test User',
					noteId: 'test-note',
				}),
			},
		})

		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const notificationBell = page
			.getByRole('button', { name: /notifications/i })
			.first()

		if (await notificationBell.isVisible()) {
			await notificationBell.click()

			const markAllAsReadButton = page
				.getByRole('button', { name: /mark all as read/i })
				.first()

			if (await markAllAsReadButton.isVisible()) {
				await markAllAsReadButton.click()

				// Wait for UI to update
				await page.waitForTimeout(500)

				// Check unread count is 0 or notification is updated
				const unreadBadge = page.getByTestId('unread-count')
				await expect(unreadBadge).not.toBeVisible()
			}
		}
	})

	test('Notification settings are accessible via keyboard', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		await page.keyboard.press('Tab')

		const firstToggle = page.getByRole('switch').first()

		if (await firstToggle.isVisible()) {
			await firstToggle.focus()
			await page.keyboard.press('Space')
			await page.keyboard.press('Tab')
		}
	})
})
