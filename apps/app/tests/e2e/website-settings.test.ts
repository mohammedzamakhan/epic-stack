import { db, eq, Organization } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Website General Settings & Site Locales', () => {
	test('Operators can toggle site published state and view subdomain link', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/website', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify page title and cards
		await expect(
			page.getByRole('heading', { name: /^website$/i }),
		).toBeVisible()
		await expect(page.getByText('Organization site')).toBeVisible()

		// Locate the publish switch in the SiteCard
		const publishSwitch = page.getByRole('switch').first()
		await expect(publishSwitch).toBeVisible()

		// Initial state is unpublished
		await expect(publishSwitch).toHaveAttribute('aria-checked', 'false')

		// Toggle switch to publish
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/website') && res.request().method() === 'POST',
			),
			publishSwitch.click(),
		])

		// Wait for UI to update
		await expect(publishSwitch).toHaveAttribute('aria-checked', 'true')
		await expect(page.getByText(/subdomain url/i)).toBeVisible()

		// Verify database state
		const [publishedOrg] = await db
			.select({ sitePublished: Organization.sitePublished })
			.from(Organization)
			.where(eq(Organization.id, org.id))
			.limit(1)

		expect(publishedOrg?.sitePublished).toBe(true)

		// Toggle back to unpublish
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/website') && res.request().method() === 'POST',
			),
			publishSwitch.click(),
		])

		await expect(publishSwitch).toHaveAttribute('aria-checked', 'false')

		// Verify database state reverted
		const [unpublishedOrg] = await db
			.select({ sitePublished: Organization.sitePublished })
			.from(Organization)
			.where(eq(Organization.id, org.id))
			.limit(1)

		expect(unpublishedOrg?.sitePublished).toBe(false)
	})

	test('Operators can view and save site content languages', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/website', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify Languages card
		await expect(
			page.getByText('Languages', { exact: true }).first(),
		).toBeVisible()
		await expect(page.getByText(/default language/i).first()).toBeVisible()

		// Save languages button
		const saveLanguagesBtn = page.getByRole('button', {
			name: /save languages/i,
		})
		await expect(saveLanguagesBtn).toBeVisible()

		// Click save languages
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/website') && res.request().method() === 'POST',
			),
			saveLanguagesBtn.click(),
		])

		// Verify database contains defaultLocale set
		const [dbOrg] = await db
			.select({
				siteDefaultLocale: Organization.siteDefaultLocale,
				siteLocales: Organization.siteLocales,
			})
			.from(Organization)
			.where(eq(Organization.id, org.id))
			.limit(1)

		expect(dbOrg).toBeTruthy()
		expect(dbOrg?.siteDefaultLocale).toBeTruthy()
	})
})
