import { prisma } from '@repo/database'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { ssoAuthService } from '#app/utils/sso-auth.server.ts'
import { BASE_URL } from '#tests/utils.ts'
import { action } from './auth.sso.$organizationSlug.ts'

const ROUTE_PATH = '/auth/sso/test-org'
const PARAMS = { organizationSlug: 'test-org' }

// Mock the SSO auth service
vi.mock('#app/utils/sso-auth.server.ts', () => ({
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
	// Create test organization
	testOrganization = await prisma.organization.create({
		data: {
			name: 'Test Organization',
			slug: 'test-org',
			description: 'Test organization for SSO',
		},
	})
})

afterEach(async () => {
	// Clean up test data
	await prisma.organization.deleteMany({
		where: { slug: 'test-org' },
	})
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
	const response = await action({ request, params: PARAMS, context: {} })

	expect(response.status).toBe(302)
	expect(response.headers.get('Location')).toContain(
		'test-provider.example.com',
	)

	// Verify SSO auth service was called with correct parameters
	expect(ssoAuthService.initiateAuth).toHaveBeenCalledWith(
		testOrganization.id,
		request,
	)
})

test('handles organization not found', async () => {
	const request = await setupRequest()

	try {
		await action({
			request,
			params: { organizationSlug: 'non-existent-org' },
			context: {},
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
			context: {},
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
		await action({ request, params: PARAMS, context: {} })
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
		await action({ request, params: PARAMS, context: {} })
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
	const response = await action({ request, params: PARAMS, context: {} })

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
