import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { ssoAuthService } from '#app/utils/sso-auth.server.ts'
import { ssoConfigurationService } from '#app/utils/sso-configuration.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { BASE_URL, convertSetCookieToCookie } from '#tests/utils.ts'
import { loader } from './auth.sso.$organizationSlug.logout.ts'

// Generate unique slug per test run to avoid conflicts with parallel tests
const TEST_ORG_SLUG = `test-org-logout-${Date.now()}-${Math.random().toString(36).substring(7)}`
const ROUTE_PATH = `/auth/sso/${TEST_ORG_SLUG}/logout`
const PARAMS = { organizationSlug: TEST_ORG_SLUG }

// Mock the SSO services
vi.mock('#app/utils/sso-auth.server.ts', () => ({
	ssoAuthService: {
		revokeTokens: vi.fn(),
	},
}))

vi.mock('#app/utils/sso-configuration.server.ts', () => ({
	ssoConfigurationService: {
		getConfiguration: vi.fn(),
	},
}))

// Mock the logout function
vi.mock('#app/utils/auth.server.ts', async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...(actual as Record<string, unknown>),
		logout: vi.fn(),
	}
})

let testOrganization: any
let testSSOConfig: any

beforeEach(async () => {
	// Create test organization with unique slug
	testOrganization = await prisma.organization.create({
		data: {
			name: 'Test Organization',
			slug: TEST_ORG_SLUG,
			description: 'Test organization for SSO',
		},
	})

	// Create test SSO configuration in database
	testSSOConfig = await (prisma as any).sSOConfiguration.create({
		data: {
			organizationId: testOrganization.id,
			providerName: 'Test OIDC Provider',
			issuerUrl: 'https://test-provider.example.com',
			clientId: 'test-client-id',
			clientSecret: 'encrypted-secret',
			scopes: 'openid email profile',
			isEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
		},
	})

	// Setup default mocks
	vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(
		testSSOConfig,
	)
})

afterEach(async () => {
	// Clean up test data by specific IDs to avoid affecting parallel tests
	if (testOrganization?.id) {
		await (prisma as any).sSOSession.deleteMany({
			where: { ssoConfig: { organizationId: testOrganization.id } },
		})
		await (prisma as any).sSOConfiguration.deleteMany({
			where: { organizationId: testOrganization.id },
		})
		await prisma.organization.deleteMany({
			where: { id: testOrganization.id },
		})
	}
	vi.clearAllMocks()
})

test('successful SSO logout revokes tokens and performs regular logout', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	// Create user and session
	const user = await prisma.user.create({
		data: createUser(),
	})

	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	// Create SSO session
	const ssoSession = await prisma.sSOSession.create({
		data: {
			sessionId: session.id,
			ssoConfigId: testSSOConfig.id,
			providerUserId: faker.string.uuid(),
			accessToken: 'encrypted-access-token',
			refreshToken: 'encrypted-refresh-token',
			tokenExpiresAt: new Date(Date.now() + 3600000),
		},
	})

	// Mock successful token revocation
	vi.mocked(ssoAuthService.revokeTokens).mockResolvedValue()

	// Mock logout function
	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest({ sessionId: session.id })

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Verify token revocation was called
	expect(ssoAuthService.revokeTokens).toHaveBeenCalledWith(ssoSession.id)

	// Verify regular logout was called
	expect(logout).toHaveBeenCalledWith({
		request,
		redirectTo: '/login',
	})

	expect(thrownResponse).toBe(mockLogoutResponse)
})

test('handles logout when organization not found', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest()

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: { organizationSlug: 'non-existent-org' },
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Should perform regular logout when organization not found
	expect(logout).toHaveBeenCalledWith({ request })
	expect(thrownResponse).toBe(mockLogoutResponse)
})

test('handles logout when SSO not configured', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(null)

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest()

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Should perform regular logout when SSO not configured
	expect(logout).toHaveBeenCalledWith({ request })
	expect(thrownResponse).toBe(mockLogoutResponse)
})

test('handles logout when SSO disabled', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue({
		...testSSOConfig,
		isEnabled: false,
	})

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest()

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Should perform regular logout when SSO disabled
	expect(logout).toHaveBeenCalledWith({ request })
	expect(thrownResponse).toBe(mockLogoutResponse)
})

test('handles logout when no session exists', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest() // No session ID

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Should perform regular logout
	expect(logout).toHaveBeenCalledWith({
		request,
		redirectTo: '/login',
	})
	expect(thrownResponse).toBe(mockLogoutResponse)
})

test('handles logout when no SSO session exists', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	// Create user and session but no SSO session
	const user = await prisma.user.create({
		data: createUser(),
	})

	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest({ sessionId: session.id })

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Should not try to revoke tokens
	expect(ssoAuthService.revokeTokens).not.toHaveBeenCalled()

	// Should perform regular logout
	expect(logout).toHaveBeenCalledWith({
		request,
		redirectTo: '/login',
	})
	expect(thrownResponse).toBe(mockLogoutResponse)
})

test('continues logout even if token revocation fails', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	// Mock console.warn since we expect it to be called when token revocation fails
	const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

	// Create user and session
	const user = await prisma.user.create({
		data: createUser(),
	})

	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	// Create SSO session
	const ssoSession = await prisma.sSOSession.create({
		data: {
			sessionId: session.id,
			ssoConfigId: testSSOConfig.id,
			providerUserId: faker.string.uuid(),
			accessToken: 'encrypted-access-token',
			refreshToken: 'encrypted-refresh-token',
			tokenExpiresAt: new Date(Date.now() + 3600000),
		},
	})

	// Mock token revocation failure
	vi.mocked(ssoAuthService.revokeTokens).mockRejectedValue(
		new Error('Token revocation failed'),
	)

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/login' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest({ sessionId: session.id })

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	// Verify token revocation was attempted
	expect(ssoAuthService.revokeTokens).toHaveBeenCalledWith(ssoSession.id)

	// Verify console.warn was called for the failed token revocation
	expect(consoleWarn).toHaveBeenCalledWith(
		'Failed to revoke SSO tokens:',
		expect.any(Error),
	)

	// Should still perform regular logout despite token revocation failure
	expect(logout).toHaveBeenCalledWith({
		request,
		redirectTo: '/login',
	})
	expect(thrownResponse).toBe(mockLogoutResponse)

	// Restore console.warn
	consoleWarn.mockRestore()
})

test('handles custom redirect URL from query params', async () => {
	const { logout } = await import('#app/utils/auth.server.ts')

	const mockLogoutResponse = new Response(null, {
		status: 302,
		headers: { Location: '/custom-redirect' },
	})
	vi.mocked(logout).mockImplementation(() => {
		throw mockLogoutResponse
	})

	const request = await setupRequest({ redirectTo: '/custom-redirect' })

	// The loader should throw the logout response
	let thrownResponse: Response | undefined
	try {
		await loader({
			request,
			params: PARAMS,
			context: {},
			unstable_pattern: '/auth/sso/:organizationSlug/logout',
		})
	} catch (response) {
		thrownResponse = response as Response
	}

	expect(logout).toHaveBeenCalledWith({
		request,
		redirectTo: '/custom-redirect',
	})
	expect(thrownResponse).toBe(mockLogoutResponse)
})

async function setupRequest({
	sessionId,
	redirectTo,
}: { sessionId?: string; redirectTo?: string } = {}) {
	const url = new URL(ROUTE_PATH, BASE_URL)
	if (redirectTo) {
		url.searchParams.set('redirectTo', redirectTo)
	}

	const authSession = await authSessionStorage.getSession()
	if (sessionId) authSession.set(sessionKey, sessionId)

	const setSessionCookieHeader =
		await authSessionStorage.commitSession(authSession)

	const request = new Request(url.toString(), {
		method: 'GET',
		headers: {
			cookie: convertSetCookieToCookie(setSessionCookieHeader),
		},
	})

	return request
}
