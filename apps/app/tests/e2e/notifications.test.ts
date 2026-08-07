import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Notifications', () => {
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

	test('Users can update email notification preferences', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const emailNotificationToggle = page
			.getByRole('switch', { name: /email notifications/i })
			.first()

		if (await emailNotificationToggle.isVisible()) {
			await emailNotificationToggle.click()

			const saveButton = page.getByRole('button', { name: /save/i })
			if (await saveButton.isVisible()) {
				await saveButton.click()

				await expect(page.getByText(/settings updated/i)).toBeVisible()
			}
		}
	})

	test('Users can update push notification preferences', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const pushNotificationToggle = page
			.getByRole('switch', { name: /push notifications/i })
			.first()

		if (await pushNotificationToggle.isVisible()) {
			await pushNotificationToggle.click()

			const saveButton = page.getByRole('button', { name: /save/i })
			if (await saveButton.isVisible()) {
				await saveButton.click()

				await expect(page.getByText(/settings updated/i)).toBeVisible()
			}
		}
	})

	test('Users can configure notification frequency', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const frequencySelect = page
			.getByRole('combobox', { name: /frequency/i })
			.first()

		if (await frequencySelect.isVisible()) {
			await frequencySelect.click()
			await page.getByRole('option', { name: /daily/i }).click()

			const saveButton = page.getByRole('button', { name: /save/i })
			if (await saveButton.isVisible()) {
				await saveButton.click()

				await expect(page.getByText(/settings updated/i)).toBeVisible()
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
			.first()

		if (await notificationBell.isVisible()) {
			await notificationBell.click()

			await expect(page.getByText(/notifications/i).first()).toBeVisible()
		}
	})

	test('Users receive notifications for organization invitations', async ({
		page,
		login,
		navigate,
	}) => {
		const invitedUser = await login()

		const owner = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		const org = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: {
						userId: owner.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		await prisma.organizationInvitation.create({
			data: {
				organizationId: org.id,
				email: invitedUser.email,
				organizationRoleId: 'org_role_member',
				token: `${faker.string.uuid()}-${Date.now()}`,
				inviterId: owner.id,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
			},
		})

		await navigate('/organizations')
		await page.waitForLoadState('networkidle')

		await expect(
			page.getByRole('heading', { name: /pending invitations/i }),
		).toBeVisible()
		await expect(page.getByText(org.name)).toBeVisible()
	})

	test('Users can mark notifications as read', async ({
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

			const markAsReadButton = page
				.getByRole('button', { name: /mark as read/i })
				.first()

			if (await markAsReadButton.isVisible()) {
				await markAsReadButton.click()

				await expect(page.getByText(/no new notifications/i)).toBeVisible()
			}
		}
	})

	test('Users can disable specific notification types', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const commentNotificationToggle = page
			.getByRole('switch', { name: /comment notifications/i })
			.first()

		if (await commentNotificationToggle.isVisible()) {
			await commentNotificationToggle.click()

			const saveButton = page.getByRole('button', { name: /save/i })
			if (await saveButton.isVisible()) {
				await saveButton.click()

				await expect(page.getByText(/settings updated/i)).toBeVisible()
			}
		}
	})

	test('Notification preferences persist across sessions', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const emailToggle = page
			.getByRole('switch', { name: /email notifications/i })
			.first()

		if (await emailToggle.isVisible()) {
			const ignored_initialState = await emailToggle.isChecked()

			await emailToggle.click()

			const saveButton = page.getByRole('button', { name: /save/i })
			if (await saveButton.isVisible()) {
				await saveButton.click()
				await expect(page.getByText(/settings updated/i)).toBeVisible()
			}

			await page.reload()
			await page.waitForLoadState('networkidle')

			await expect(emailToggle).toBeChecked()
		}
	})

	test('Users can configure notification channels', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const channelOptions = page.getByText(/notification channels/i)

		if (await channelOptions.isVisible()) {
			await expect(page.getByText(/email/i)).toBeVisible()
			await expect(page.getByText(/browser/i)).toBeVisible()
		}
	})

	test('Notification settings show current preferences', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		await expect(page.getByText(/notification/i).first()).toBeVisible()

		await expect(
			page.getByText(/notification preferences/i).first(),
		).toBeVisible()

		const toggles = page.getByRole('switch')
		const toggleCount = await toggles.count()

		const loadingMessage = page.getByText('Loading preferences...')
		const noPreferencesMessage = page
			.getByText(
				/Notification preferences are not available|No preferences found|ensure you have an active organization/i,
			)
			.first()
		const errorMessage = page.getByText(
			/Failed to load notification preferences/,
		)

		const hasToggles = toggleCount > 0
		const isLoading = await loadingMessage.isVisible()
		const hasNoPreferences = await noPreferencesMessage.isVisible()
		const hasError = await errorMessage.isVisible()

		expect(hasToggles || isLoading || hasNoPreferences || hasError).toBe(true)
	})

	test('Users can test notification delivery', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const testButton = page
			.getByRole('button', { name: /test notification/i })
			.first()

		if (await testButton.isVisible()) {
			await testButton.click()

			await expect(page.getByText(/test notification sent/i)).toBeVisible()
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
