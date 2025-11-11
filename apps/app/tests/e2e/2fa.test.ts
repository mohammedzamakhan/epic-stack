import { faker } from '@faker-js/faker'
import { generateTOTP } from '#app/utils/totp.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'

test('Users can add 2FA to their account and use it when logging in', async ({
	page,
	login,
	navigate,
}) => {
	const password = faker.internet.password()
	const user = await login({ password })
	await navigate('/security')

	// Wait for the page to be fully loaded
	await page.waitForLoadState('networkidle')

	const main = page.getByRole('main')
	const enable2FAButton = main.getByRole('button', { name: /Enable 2FA/i })
	await expect(enable2FAButton).toBeVisible()
	await enable2FAButton.click()

	// Wait for the specific dialog title instead of generic dialog role
	await expect(
		page.getByRole('heading', { name: 'Two-Factor Authentication' }),
	).toBeVisible()

	// Wait for the authentication code input which should always be present
	await expect(
		page.getByRole('textbox', { name: /Authentication Code/i }),
	).toBeVisible()

	await page.getByRole('tab', { name: /Setup key/i }).click()

	// Wait for the OTP URI element to be available before accessing its text
	const otpUriElement = page.getByLabel(/One-time Password URI/i)
	await expect(otpUriElement).toBeVisible()
	const otpUriString = await otpUriElement.innerText()

	const otpUri = new URL(otpUriString)
	const options = Object.fromEntries(otpUri.searchParams)

	await page.getByRole('textbox', { name: /Authentication Code/i }).fill(
		(
			await generateTOTP({
				...options,
				// the algorithm will be "SHA1" but we need to generate the OTP with "SHA-1"
				algorithm: 'SHA-1',
			})
		).otp,
	)
	await page.getByRole('button', { name: /Confirm/i }).click()
	// Wait specifically for the dialog heading (level 2) to be hidden, not the main page heading
	await expect(
		page.getByRole('heading', { name: 'Two-Factor Authentication', level: 2 }),
	).toBeHidden()

	await expect(main.getByRole('button', { name: /Disable 2FA/i })).toBeVisible()

	// Logout
	await page
		.getByRole('button', { name: user.name ?? user.username })
		.first()
		.click()
	await page.getByRole('button', { name: /log out/i }).click()

	await navigate('/login')
	await expect(page).toHaveURL(`/login`)
	await page
		.getByRole('textbox', { name: /email or username/i })
		.fill(user.username)
	await page.getByRole('button', { name: 'Continue', exact: true }).click()
	await page.getByLabel(/^password$/i).fill(password)
	await page.getByRole('button', { name: 'Sign In', exact: true }).click()

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

	// Wait for navigation after verification
	await page.waitForURL(/\/(organizations\/create|$)/)

	// Navigate to the app to verify the user is properly logged in
	await navigate('/')

	// User should be redirected to organization creation page (authenticated area)
	await page.waitForURL('/organizations/create')

	// Wait for the page to fully load
	await page.waitForLoadState('networkidle')

	// Wait for the card with organization creation form to be visible
	await expect(
		page.getByText(
			'An organization is a workspace where teams collect, organize, and work together.',
		),
	).toBeVisible()

	// Verify we're on the organization creation page by checking for the main heading
	await expect(
		page.getByRole('heading', { name: 'Create a new organization' }),
	).toBeVisible()
})
