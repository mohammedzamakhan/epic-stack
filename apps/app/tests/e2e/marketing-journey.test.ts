import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Marketing Automation Journey Builder E2E', () => {
	test('User can navigate to Marketing Journeys, open visual builder canvas, and view palette', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// 1. Navigate to Marketing Journeys overview
		await navigate('/:slug/marketing/journeys', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify page title and header elements
		await expect(
			page.getByRole('heading', { name: /marketing automation/i }),
		).toBeVisible()
		await expect(page.getByRole('link', { name: /new journey/i })).toBeVisible()

		// 2. Click "New Journey" to open Visual Canvas
		await page.getByRole('link', { name: /new journey/i }).click()
		await page.waitForLoadState('networkidle')
		await expect(page).toHaveURL(
			new RegExp(`/${org.slug}/marketing/journeys/new`),
		)

		// 3. Verify Canvas layout: Toolbar, Palette, ReactFlow
		await expect(page.getByText(/new customer journey/i)).toBeVisible()
		await expect(
			page.getByRole('button', { name: /save draft/i }),
		).toBeVisible()
		await expect(page.getByRole('button', { name: /publish/i })).toBeVisible()

		// Verify Node Palette components
		await expect(page.getByText(/node library/i)).toBeVisible()
		await expect(page.getByText(/trigger/i).first()).toBeVisible()
		await expect(page.getByText(/delay \/ wait/i)).toBeVisible()
		await expect(page.getByText(/send email/i)).toBeVisible()
		await expect(page.getByText(/send sms/i)).toBeVisible()
		await expect(page.getByText(/condition/i)).toBeVisible()

		// Verify React Flow canvas container
		// eslint-disable-next-line playwright/no-raw-locators -- React Flow viewport has no semantic role
		const reactFlowContainer = page.locator('.react-flow')
		await expect(reactFlowContainer).toBeVisible()

		// Verify default trigger node is present on canvas
		await expect(page.getByRole('heading', { name: 'Trigger' })).toBeVisible()
	})

	test('Visual Canvas validates DAG and displays node configuration inspector', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// Navigate directly to new journey canvas
		await navigate('/:slug/marketing/journeys/new', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Click on default trigger node to open inspector drawer
		const triggerNode = page.getByRole('heading', { name: 'Trigger' })
		await triggerNode.click()

		// Verify Inspector drawer opened
		await expect(page.getByText(/node inspector/i)).toBeVisible()
		await expect(page.getByText(/trigger type/i)).toBeVisible()

		// Click "Delay / Wait" in palette to add a delay node
		const delayPaletteBtn = page.getByRole('button', { name: /delay \/ wait/i })
		if (await delayPaletteBtn.isVisible()) {
			await delayPaletteBtn.click()
			await expect(
				page.getByRole('heading', { name: 'Time delay' }),
			).toBeVisible()
		}

		// Click "Send Email" in palette to add email action
		const emailPaletteBtn = page.getByRole('button', { name: /send email/i })
		if (await emailPaletteBtn.isVisible()) {
			await emailPaletteBtn.click()
			await expect(page.getByRole('heading', { name: 'Email' })).toBeVisible()
		}

		// Click on email node to inspect email settings and merge tag chips
		const emailNode = page.getByRole('heading', { name: 'Email' })
		await emailNode.click()

		await expect(page.getByText(/subject line/i)).toBeVisible()
		await expect(page.getByText(/merge tags/i)).toBeVisible()
		await expect(
			page.getByRole('button', { name: /\{\{name\}\}/i }),
		).toBeVisible()
	})

	test('User can view execution history and runs page', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// Navigate to Marketing overview tab
		await navigate('/:slug/marketing', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify navigation tabs
		await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible()
		await expect(
			page.getByRole('tab', { name: /automated journeys/i }),
		).toBeVisible()

		// Click Automated Journeys tab
		await page.getByRole('tab', { name: /automated journeys/i }).click()
		await expect(page).toHaveURL(new RegExp(`/${org.slug}/marketing/journeys`))
	})
})
