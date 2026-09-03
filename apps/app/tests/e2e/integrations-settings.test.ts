import { db, eq, Integration } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Integration Settings & Providers Management', () => {
	test('Operators can view available integrations catalog and request banner', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/integrations', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify page title and header
		await expect(
			page.getByRole('heading', { name: /^settings$/i }),
		).toBeVisible()
		await expect(page.getByText('Integrations').first()).toBeVisible()

		// Verify provider cards in the catalog
		await expect(page.getByText('Slack').first()).toBeVisible()
		await expect(page.getByText('Jira').first()).toBeVisible()
		await expect(page.getByText('Linear').first()).toBeVisible()
		await expect(page.getByText('GitLab').first()).toBeVisible()

		// Verify request integration banner
		await expect(
			page.getByText(/need an integration but don't see it here\?/i),
		).toBeVisible()
		await expect(
			page.getByRole('link', { name: /request integration/i }),
		).toBeVisible()
	})

	test('Operators can view connected integrations and disconnect an active integration', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// Seed an active Slack integration
		const [seededIntegration] = await db
			.insert(Integration)
			.values({
				organizationId: org.id,
				providerName: 'slack',
				providerType: 'productivity',
				config: '{}',
				isActive: true,
			})
			.returning()

		if (!seededIntegration) throw new Error('Seeded integration not found')
		expect(seededIntegration).toBeTruthy()

		await navigate('/:slug/settings/integrations', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify disconnect button appears for connected integration
		const disconnectButton = page.getByRole('button', {
			name: /^disconnect$/i,
		})
		await expect(disconnectButton).toBeVisible()

		// Disconnect the integration
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/settings/integrations') &&
					res.request().method() === 'POST',
			),
			disconnectButton.click(),
		])

		// Verify button reverts to Connect
		await expect(
			page.getByRole('button', { name: /^disconnect$/i }),
		).not.toBeVisible()

		// Verify integration was removed from the database
		const [deletedIntegration] = await db
			.select()
			.from(Integration)
			.where(eq(Integration.id, seededIntegration.id))
			.limit(1)

		expect(deletedIntegration).toBeUndefined()
	})
})
