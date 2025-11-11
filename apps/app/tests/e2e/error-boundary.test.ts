import { expect, test } from '#tests/playwright-utils.ts'

test.skip('Test root error boundary caught', async ({ page, navigate }) => {
	const res = await navigate('/does-not-exist')

	expect(res?.status()).toBe(404)
	await expect(page.getByText(/Page not found/i)).toBeVisible()
})
