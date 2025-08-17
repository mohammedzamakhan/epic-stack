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

	const dialog = page.getByRole('dialog')
	await expect(dialog).toBeVisible()

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
	await expect(dialog).toBeHidden()

	await expect(main.getByRole('button', { name: /disable 2fa/i })).toBeVisible()

	// Logout
	await page.getByRole('button', { name: user.name ?? user.username }).click()
	await page.getByRole('button', { name: /log out/i }).click()
	await expect(page.getByRole('link', { name: /log in/i })).toBeVisible()

	await page.goto('/login')
	await expect(page).toHaveURL(`/login`)
	await page.getByRole('textbox', { name: /username/i }).fill(user.username)
	await page.getByLabel(/^password$/i).fill(password)
	await page.getByRole('button', { name: 'Login', exact: true }).click()

	await expect(page).toHaveURL(/\/verify/)
	await page.getByRole('textbox', { name: /code/i }).fill(
		(
			await generateTOTP({
				...options,
				// the algorithm will be "SHA1" but we need to generate the OTP with "SHA-1"
				algorithm: 'SHA-1',
			})
		).otp,
	)

	await page.getByRole('button', { name: /verify/i }).click()

	await expect(page).toHaveURL('/')
	await expect(
		page.getByRole('link', { name: user.name ?? user.username }),
	).toBeVisible()
})
