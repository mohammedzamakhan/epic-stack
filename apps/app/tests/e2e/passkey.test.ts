import { faker } from '@faker-js/faker'
import { expect, test } from '#tests/playwright-utils.ts'

async function setupWebAuthn(page: any) {
	const client = await page.context().newCDPSession(page)
	// https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
	await client.send('WebAuthn.enable', { options: { enableUI: true } })
	const result = await client.send('WebAuthn.addVirtualAuthenticator', {
		options: {
			protocol: 'ctap2',
			transport: 'usb',
			hasResidentKey: true,
			hasUserVerification: true,
			isUserVerified: true,
			automaticPresenceSimulation: true,
		},
	})
	return { client, authenticatorId: result.authenticatorId }
}

test('Users can register and use passkeys', async ({
	page,
	login,
	navigate,
}) => {
	const user = await login()

	const { client, authenticatorId } = await setupWebAuthn(page)

	const initialCredentials = await client.send('WebAuthn.getCredentials', {
		authenticatorId,
	})
	expect(
		initialCredentials.credentials,
		'No credentials should exist initially',
	).toHaveLength(0)

	await navigate('/security')
	await page.waitForLoadState('networkidle')
	await page.getByRole('button', { name: /manage passkeys/i }).click()

	const passkeyRegisteredPromise = new Promise<void>((resolve) => {
		client.once('WebAuthn.credentialAdded', () => resolve())
	})
	await page.getByRole('button', { name: /register new passkey/i }).click()
	await passkeyRegisteredPromise

	// Verify the passkey appears in the UI
	await expect(page.getByRole('list', { name: /passkeys/i })).toBeVisible()
	await expect(page.getByText(/registered .* ago/i)).toBeVisible()

	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog')).toBeHidden()

	const afterRegistrationCredentials = await client.send(
		'WebAuthn.getCredentials',
		{ authenticatorId },
	)
	expect(
		afterRegistrationCredentials.credentials,
		'One credential should exist after registration',
	).toHaveLength(1)

	// Logout
	await page
		.getByRole('button', { name: user.name ?? user.username })
		.first()
		.click()
	await page
		.getByRole('menuitem', { name: /(log out|logout)/i })
		.click({ force: true })
	await page.waitForURL(/\/login|\/signup/)

	// Try logging in with passkey
	await navigate('/login')
	const signCount1 = afterRegistrationCredentials.credentials[0].signCount

	const passkeyAssertedPromise = new Promise<void>((resolve) => {
		client.once('WebAuthn.credentialAsserted', () => resolve())
	})

	await page.getByRole('button', { name: /login with a passkey/i }).click()

	// Check for error message before waiting for completion
	const errorLocator = page.getByText(/failed to authenticate/i)
	const errorPromise = errorLocator.waitFor({ timeout: 1000 }).then(() => {
		throw new Error('Passkey authentication failed')
	})

	await Promise.race([passkeyAssertedPromise, errorPromise])

	// Verify successful login
	await page.waitForURL(/\/organizations\/create/)

	// Verify the sign count increased
	const afterLoginCredentials = await client.send('WebAuthn.getCredentials', {
		authenticatorId,
	})
	expect(afterLoginCredentials.credentials).toHaveLength(1)
	expect(afterLoginCredentials.credentials[0].signCount).toBeGreaterThan(
		signCount1,
	)

	// Go to passkeys page and delete the passkey
	await navigate('/security')
	await page.waitForLoadState('networkidle')
	await page.getByRole('button', { name: /manage passkeys/i }).click()
	await page.getByRole('button', { name: /delete/i }).click()

	// Verify the passkey is no longer listed on the page
	await expect(page.getByText(/no passkeys registered/i)).toBeVisible()

	await page.keyboard.press('Escape')
	await expect(page.getByRole('dialog')).toBeHidden()

	// But verify it still exists in the authenticator
	const afterDeletionCredentials = await client.send(
		'WebAuthn.getCredentials',
		{ authenticatorId },
	)
	expect(afterDeletionCredentials.credentials).toHaveLength(1)

	// Logout again to test deleted passkey
	await page
		.getByRole('button', { name: user.name ?? user.username })
		.first()
		.click()
	await page
		.getByRole('menuitem', { name: /(log out|logout)/i })
		.click({ force: true })
	await page.waitForURL(/\/login|\/signup/)

	// Try logging in with the deleted passkey
	await navigate('/login')
	const deletedPasskeyAssertedPromise = new Promise<void>((resolve) => {
		client.once('WebAuthn.credentialAsserted', () => resolve())
	})

	await page.getByRole('button', { name: /login with a passkey/i }).click()

	await deletedPasskeyAssertedPromise

	// Verify error message appears
	await expect(page.getByText(/passkey not found/i)).toBeVisible()

	// Verify we're still on the login page
	await expect(page).toHaveURL(`/login`)
})

test('Failed passkey verification shows error', async ({
	page,
	login,
	navigate,
}) => {
	const password = faker.internet.password()
	await login({ password })
	const { client, authenticatorId } = await setupWebAuthn(page)
	await navigate('/security')
	await page.waitForLoadState('networkidle')
	await page.getByRole('button', { name: /manage passkeys/i }).click()

	// Try to register with failed verification
	await client.send('WebAuthn.setUserVerified', {
		authenticatorId,
		isUserVerified: false,
	})

	await client.send('WebAuthn.setAutomaticPresenceSimulation', {
		authenticatorId,
		enabled: true,
	})

	await page.getByRole('button', { name: /register new passkey/i }).click()

	// Wait for error message
	await expect(
		page.getByText(
			/failed to create passkey|passkey registration was cancelled/i,
		),
	).toBeVisible()

	// Verify no passkey was registered
	const credentials = await client.send('WebAuthn.getCredentials', {
		authenticatorId,
	})
	expect(credentials.credentials).toHaveLength(0)
})
