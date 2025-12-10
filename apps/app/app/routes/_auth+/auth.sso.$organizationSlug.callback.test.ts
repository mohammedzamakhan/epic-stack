import { invariant } from '@epic-web/invariant'
import { faker } from '@faker-js/faker'
import { prisma } from '@repo/database'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { ssoAuthService } from '#app/utils/sso-auth.server.ts'
import { ssoConfigurationService } from '#app/utils/sso-configuration.server.ts'
import { createUser } from '#tests/db-utils.ts'
import { consoleError } from '#tests/setup/setup-test-env.ts'
import { BASE_URL, convertSetCookieToCookie } from '#tests/utils.ts'
import { loader } from './auth.sso.$organizationSlug.callback.ts'

const ROUTE_PATH = '/auth/sso/test-org/callback'
const PARAMS = { organizationSlug: 'test-org' }

// Mock the SSO services
vi.mock('#app/utils/sso-auth.server.ts', () => ({
	ssoAuthService: {
		handleCallback: vi.fn(),
		provisionUser: vi.fn(),
		createSSOSession: vi.fn(),
	},
}))

vi.mock('#app/utils/sso-configuration.server.ts', () => ({
	ssoConfigurationService: {
		getConfiguration: vi.fn(),
	},
}))

let testOrganization: any
let testSSOConfig: any

beforeEach(async () => {
	// Create test organization
	testOrganization = await prisma.organization.create({
		data: {
			name: 'Test Organization',
			slug: 'test-org',
			description: 'Test organization for SSO',
		},
	})

	// Create test SSO configuration
	testSSOConfig = {
		id: faker.string.uuid(),
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
	}

	// Setup default mocks
	vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(
		testSSOConfig,
	)
})

afterEach(async () => {
	// Clean up test data
	await prisma.organization.deleteMany({
		where: { slug: 'test-org' },
	})
	vi.clearAllMocks()
})

test('successful SSO authentication creates session for existing user', async () => {
	const userData = createUser()
	const existingUser = await prisma.user.create({
		data: userData,
	})

	// Add user to organization
	const memberRole = await prisma.organizationRole.findFirst({
		where: { name: 'member' },
	})
	invariant(memberRole, 'Member role should exist')

	await prisma.userOrganization.create({
		data: {
			userId: existingUser.id,
			organizationId: testOrganization.id,
			organizationRoleId: memberRole.id,
		},
	})

	const mockProviderUser = {
		id: faker.string.uuid(),
		email: userData.email,
		username: userData.username,
		name: userData.name,
		tokens: {
			accessToken: 'mock-access-token',
			refreshToken: 'mock-refresh-token',
			idToken: 'mock-id-token',
			expiresAt: new Date(Date.now() + 3600000),
			scope: ['openid', 'email', 'profile'],
		},
	}

	vi.mocked(ssoAuthService.handleCallback).mockResolvedValue(mockProviderUser)
	vi.mocked(ssoAuthService.provisionUser).mockResolvedValue(existingUser)
	vi.mocked(ssoAuthService.createSSOSession).mockResolvedValue({} as any)

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	})

	expect(response).toHaveRedirect('/')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Welcome!',
			type: 'success',
		}),
	)
	await expect(response).toHaveSessionForUser(existingUser.id)

	// Verify SSO session was created
	expect(ssoAuthService.createSSOSession).toHaveBeenCalledWith(
		expect.any(String),
		testSSOConfig.id,
		mockProviderUser.id,
		mockProviderUser.tokens,
	)
})

test('successful SSO authentication with auto-provisioning creates new user', async () => {
	const newUserData = {
		id: faker.string.uuid(),
		email: faker.internet.email(),
		username: faker.internet.username(),
		name: faker.person.fullName(),
	}

	const createdUser = await prisma.user.create({
		data: {
			...createUser(),
			email: newUserData.email,
			username: newUserData.username,
			name: newUserData.name,
		},
	})

	const mockProviderUser = {
		id: faker.string.uuid(),
		email: newUserData.email,
		username: newUserData.username,
		name: newUserData.name,
		tokens: {
			accessToken: 'mock-access-token',
			refreshToken: 'mock-refresh-token',
			idToken: 'mock-id-token',
			expiresAt: new Date(Date.now() + 3600000),
			scope: ['openid', 'email', 'profile'],
		},
	}

	vi.mocked(ssoAuthService.handleCallback).mockResolvedValue(mockProviderUser)
	vi.mocked(ssoAuthService.provisionUser).mockResolvedValue(createdUser)
	vi.mocked(ssoAuthService.createSSOSession).mockResolvedValue({} as any)

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	})

	expect(response).toHaveRedirect('/')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Welcome!',
			description: 'Your account has been created and you are now logged in.',
			type: 'success',
		}),
	)
	await expect(response).toHaveSessionForUser(createdUser.id)

	// Verify user provisioning was called
	expect(ssoAuthService.provisionUser).toHaveBeenCalledWith(
		{
			sub: mockProviderUser.id,
			email: mockProviderUser.email,
			name: mockProviderUser.name,
			preferred_username: mockProviderUser.username,
		},
		testSSOConfig,
	)
})

test('handles organization not found', async () => {
	const request = await setupRequest()
	const response = await loader({
		request,
		params: { organizationSlug: 'non-existent-org' },
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	}).catch((e) => e)

	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Organization Not Found',
			type: 'error',
		}),
	)
})

test('handles SSO not configured for organization', async () => {
	vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(null)

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	}).catch((e) => e)

	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'SSO Not Available',
			type: 'error',
		}),
	)
})

test('handles SSO disabled for organization', async () => {
	vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue({
		...testSSOConfig,
		isEnabled: false,
	})

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	}).catch((e) => e)

	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'SSO Not Available',
			type: 'error',
		}),
	)
})

test('handles OAuth callback failure', async () => {
	consoleError.mockImplementation(() => {})

	vi.mocked(ssoAuthService.handleCallback).mockRejectedValue(
		new Error('OAuth callback failed'),
	)

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	}).catch((e) => e)

	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'SSO Authentication Failed',
			type: 'error',
		}),
	)
	expect(consoleError).toHaveBeenCalledWith(
		'SSO authentication failed:',
		expect.any(Error),
	)
})

test('handles user provisioning failure', async () => {
	consoleError.mockImplementation(() => {})

	const mockProviderUser = {
		id: faker.string.uuid(),
		email: faker.internet.email(),
		username: faker.internet.username(),
		name: faker.person.fullName(),
	}

	vi.mocked(ssoAuthService.handleCallback).mockResolvedValue(mockProviderUser)
	vi.mocked(ssoAuthService.provisionUser).mockRejectedValue(
		new Error('User provisioning failed: auto-provisioning disabled'),
	)

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	}).catch((e) => e)

	invariant(response instanceof Response, 'response should be a Response')
	expect(response).toHaveRedirect('/login')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'User Provisioning Failed',
			description: 'User provisioning failed: auto-provisioning disabled',
			type: 'error',
		}),
	)
	expect(consoleError).toHaveBeenCalledWith(
		'User provisioning failed:',
		expect.any(Error),
	)
})

test('handles user already logged in', async () => {
	const session = await setupUser()

	// Mock the SSO service methods even though they won't be called
	vi.mocked(ssoAuthService.handleCallback).mockResolvedValue({
		id: faker.string.uuid(),
		email: faker.internet.email(),
		username: faker.internet.username(),
		name: faker.person.fullName(),
	})

	const request = await setupRequest({ sessionId: session.id })
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	})

	expect(response).toHaveRedirect('/settings/profile')
	await expect(response).toSendToast(
		expect.objectContaining({
			title: 'Already Authenticated',
			description: 'You are already logged in.',
		}),
	)
})

test('handles banned user login attempt', async () => {
	const userData = createUser()
	const bannedUser = await prisma.user.create({
		data: {
			...userData,
			isBanned: true,
			banReason: 'Test ban',
		},
	})

	const mockProviderUser = {
		id: faker.string.uuid(),
		email: userData.email,
		username: userData.username,
		name: userData.name,
	}

	vi.mocked(ssoAuthService.handleCallback).mockResolvedValue(mockProviderUser)
	vi.mocked(ssoAuthService.provisionUser).mockResolvedValue(bannedUser)

	const request = await setupRequest()
	const response = await loader({
		request,
		params: PARAMS,
		context: {},
		unstable_pattern: '/auth/sso/:organizationSlug/callback',
	})

	expect(response).toHaveRedirect('/login?banned=true')
})

async function setupRequest({
	sessionId,
	code = faker.string.uuid(),
	state = faker.string.uuid(),
}: { sessionId?: string; code?: string; state?: string } = {}) {
	const url = new URL(ROUTE_PATH, BASE_URL)
	url.searchParams.set('state', state)
	url.searchParams.set('code', code)

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

async function setupUser(userData = createUser()) {
	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					...userData,
				},
			},
		},
		select: {
			id: true,
			userId: true,
		},
	})

	return session
}
