import { prisma } from '@repo/database'
import { type AppLoadContext } from 'react-router'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ssoAuthService } from '#app/utils/sso/auth.server.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action } from './auth.sso.$organizationSlug.ts'

// Mock context helper for tests
const createMockContext = (): AppLoadContext => ({
	serverBuild: {} as any,
})

// Generate unique slug per test run to avoid conflicts with parallel tests
const TEST_ORG_SLUG = `test-org-sso-${Date.now()}-${Math.random().toString(36).substring(7)}`
const ROUTE_PATH = `/auth/sso/${TEST_ORG_SLUG}`
const PARAMS = { organizationSlug: TEST_ORG_SLUG }

// Mock the SSO auth service
vi.mock('#app/utils/sso/auth.server.ts', () => ({
	ssoAuthService: {
		initiateAuth: vi.fn(),
	},
}))

// Mock the auth server functions
vi.mock('#app/utils/auth.server.ts', () => ({
	getSSOStrategy: vi.fn(),
}))

let testOrganization: any

beforeEach(async () => {
	// Create test organization with unique slug
	testOrganization = await prisma.organization.create({
		data: {
			name: 'Test Organization',
			slug: TEST_ORG_SLUG,
			description: 'Test organization for SSO',
		},
	})
})

afterEach(async () => {
	// Clean up test data by specific ID to avoid affecting parallel tests
	if (testOrganization?.id) {
		await prisma.organization.deleteMany({
			where: { id: testOrganization.id },
		})
	}
	vi.clearAllMocks()
})

test('successful SSO initiation redirects to identity provider', async () => {
	const { getSSOStrategy } = await import('#app/utils/auth.server.ts')

	// Mock successful strategy retrieval
	vi.mocked(getSSOStrategy).mockResolvedValue('sso-test-org-id')

	// Mock successful auth initiation with redirect response
	const mockRedirectResponse = new Response(null, {
		status: 302,
		headers: {
			Location:
				'https://test-provider.example.com/auth?client_id=test&redirect_uri=callback',
		},
	})
	vi.mocked(ssoAuthService.initiateAuth).mockResolvedValue(mockRedirectResponse)

	const request = await setupRequest()
	const response = await action({
		request,
		params: PARAMS,
		context: createMockContext(),
		unstable_pattern: '/auth/sso/:organizationSlug',
	})

	expect(response.status).toBe(302)
	expect(response.headers.get('Location')).toContain(
		'test-provider.example.com',
	)

	// Verify SSO auth service was called with correct parameters (including nonce)
	expect(ssoAuthService.initiateAuth).toHaveBeenCalledWith(
		testOrganization.id,
		request,
		expect.any(String), // nonce is a random string
	)
})

test('handles organization not found', async () => {
	const request = await setupRequest()

	try {
		await action({
			request,
			params: { organizationSlug: 'non-existent-org' },
			context: createMockContext(),
			unstable_pattern: '/auth/sso/:organizationSlug',
		})
		expect.fail('Should have thrown an error')
	} catch (error) {
		expect(error).toBeInstanceOf(Response)
		expect((error as Response).status).toBe(404)
	}
})

test('handles missing organization slug', async () => {
	const request = await setupRequest()

	try {
		await action({
			request,
			params: { organizationSlug: '' },
			context: createMockContext(),
			unstable_pattern: '/auth/sso/:organizationSlug',
		})
		expect.fail('Should have thrown an error')
	} catch (error) {
		expect(error).toBeInstanceOf(Response)
		expect((error as Response).status).toBe(400)
	}
})

test('handles SSO not configured for organization', async () => {
	const { getSSOStrategy } = await import('#app/utils/auth.server.ts')

	// Mock no strategy found (SSO not configured)
	vi.mocked(getSSOStrategy).mockResolvedValue(null)

	const request = await setupRequest()

	try {
		await action({
			request,
			params: PARAMS,
			context: createMockContext(),
			unstable_pattern: '/auth/sso/:organizationSlug',
		})
		expect.fail('Should have thrown an error')
	} catch (error) {
		expect(error).toBeInstanceOf(Response)
		expect((error as Response).status).toBe(400)
	}
})

test('handles SSO authentication service error', async () => {
	const { getSSOStrategy } = await import('#app/utils/auth.server.ts')

	// Mock successful strategy retrieval
	vi.mocked(getSSOStrategy).mockResolvedValue('sso-test-org-id')

	// Mock auth service throwing an error
	vi.mocked(ssoAuthService.initiateAuth).mockRejectedValue(
		new Error('Identity provider unavailable'),
	)

	const request = await setupRequest()

	try {
		await action({
			request,
			params: PARAMS,
			context: createMockContext(),
			unstable_pattern: '/auth/sso/:organizationSlug',
		})
		expect.fail('Should have thrown an error')
	} catch (error) {
		expect(error).toBeInstanceOf(Error)
		expect((error as Error).message).toBe('Identity provider unavailable')
	}
})

test('preserves redirect URL in cookie', async () => {
	const { getSSOStrategy } = await import('#app/utils/auth.server.ts')

	// Mock successful strategy retrieval
	vi.mocked(getSSOStrategy).mockResolvedValue('sso-test-org-id')

	// Mock successful auth initiation
	const mockRedirectResponse = new Response(null, {
		status: 302,
		headers: {
			Location: 'https://test-provider.example.com/auth',
		},
	})
	vi.mocked(ssoAuthService.initiateAuth).mockResolvedValue(mockRedirectResponse)

	const redirectTo = '/dashboard'
	const request = await setupRequest({ redirectTo })
	const response = await action({
		request,
		params: PARAMS,
		context: createMockContext(),
		unstable_pattern: '/auth/sso/:organizationSlug',
	})

	// Check that redirect cookie was set
	const setCookieHeader = response.headers.get('set-cookie')
	expect(setCookieHeader).toContain('redirectTo')
})

async function setupRequest({ redirectTo }: { redirectTo?: string } = {}) {
	const url = new URL(ROUTE_PATH, BASE_URL)

	const formData = new FormData()
	if (redirectTo) {
		formData.append('redirectTo', redirectTo)
	}

	const request = new Request(url.toString(), {
		method: 'POST',
		body: formData,
	})

	return request
}
