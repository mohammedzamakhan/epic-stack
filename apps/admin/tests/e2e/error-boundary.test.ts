import { expect, test } from '#tests/playwright-utils.ts'

test('Test root error boundary caught', async ({ page, navigate }) => {
	const pageUrl = '/does-not-exist'
	const res = await navigate(pageUrl)

	expect(res?.status()).toBe(404)
	await expect(page.getByText(/Page not found/i)).toBeVisible()
})
