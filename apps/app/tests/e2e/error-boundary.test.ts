import { expect, test } from '#tests/playwright-utils.ts'

test.skip('Test root error boundary caught', async ({ page }) => {
	const pageUrl = '/does-not-exist'
	const res = await page.goto(pageUrl)

	expect(res?.status()).toBe(404)
	await expect(page.getByText(/Page not found/i)).toBeVisible()
})
