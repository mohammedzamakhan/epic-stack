import { faker } from '@faker-js/faker'
import { generateTOTP } from '#app/utils/totp.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'

test('Users can add 2FA to their account and use it when logging in', async ({
	page,
	login,
}) => {
	const password = faker.internet.password()
	const user = await login({ password })
	await page.goto('/app/security')

	const main = page.getByRole('main')
	await main.getByRole('button', { name: /enable 2fa/i }).click()

	await page.waitForSelector('[role="dialog"]', { state: 'visible' })
	const dialog = page.locator('[role="dialog"]')

	const otpUriString = await dialog
		.getByLabel(/One-Time Password URI/i)
		.innerText()

	const otpUri = new URL(otpUriString)
	const options = Object.fromEntries(otpUri.searchParams)

	await dialog.getByRole('textbox', { name: /authentication code/i }).fill(
		(
			await generateTOTP({
				...options,
				// the algorithm will be "SHA1" but we need to generate the OTP with "SHA-1"
				algorithm: 'SHA-1',
			})
		).otp,
	)
	await dialog.getByRole('button', { name: /enable 2fa/i }).click()

	await expect(main.getByRole('button', { name: /disable 2fa/i })).toBeVisible()

	// Navigate to home page first, then logout
	await page.goto('/')
	await page.getByRole('button', { name: /log out/i }).click()
	await expect(page).toHaveURL(`/`)

	await page.goto('/login')
	await expect(page).toHaveURL(`/login`)
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByLabel(/^password$/i).fill(password)
	await page
		.getByRole('button', { name: 'Login', exact: true })
		.click({ force: true })

	await page.getByRole('textbox', { name: /code/i }).fill(
		(
			await generateTOTP({
				...options,
				// the algorithm will be "SHA1" but we need to generate the OTP with "SHA-1"
				algorithm: 'SHA-1',
			})
		).otp,
	)

	await page.getByRole('button', { name: /submit/i }).click()

	await expect(
		page.getByRole('link', { name: user.name ?? user.username }),
	).toBeVisible()
})
