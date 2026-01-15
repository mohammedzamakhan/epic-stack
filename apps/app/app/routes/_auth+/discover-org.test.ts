import { faker } from '@faker-js/faker'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { loader } from './discover-org.ts'

interface DiscoverOrgResponse {
	error: string | null
	organization: any
	ssoConfig: any
	ssoAvailable: boolean
}

// Mock dependencies
vi.mock('#app/utils/organization/organizations.server.ts', () => ({
	discoverOrganizationFromEmail: vi.fn(),
}))

vi.mock('#app/utils/sso/configuration.server.ts', () => ({
	ssoConfigurationService: {
		getConfiguration: vi.fn(),
	},
}))

const { discoverOrganizationFromEmail } = await import(
	'#app/utils/organization/organizations.server.ts'
)
const { ssoConfigurationService } = await import(
	'#app/utils/sso/configuration.server.ts'
)

describe('discover-org route', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('loader', () => {
		it('should return error for missing email parameter', async () => {
			const request = new Request('http://localhost:3000/discover-org')

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(400)
			expect(data.error).toBe('Invalid email format')
			expect(data.ssoAvailable).toBe(false)
		})

		it('should return error for invalid email format', async () => {
			const request = new Request(
				'http://localhost:3000/discover-org?email=invalid-email',
			)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(400)
			expect(data.error).toBe('Invalid email format')
			expect(data.ssoAvailable).toBe(false)
		})

		it('should return no organization found when domain is not registered', async () => {
			const email = 'user@unknown-domain.com'
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockResolvedValue(null)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(200)
			expect(data.error).toBeNull()
			expect(data.organization).toBeNull()
			expect(data.ssoConfig).toBeNull()
			expect(data.ssoAvailable).toBe(false)
			expect(discoverOrganizationFromEmail).toHaveBeenCalledWith(email)
		})

		it('should return organization without SSO when no SSO config exists', async () => {
			const email = 'user@example.com'
			const mockOrganization = {
				id: faker.string.uuid(),
				name: 'Example Corp',
				slug: 'example-corp',
				verifiedDomain: 'example.com',
				size: null,
				description: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				planName: null,
				stripeCustomerId: null,
				stripeProductId: null,
				stripeSubscriptionId: null,
				subscriptionStatus: null,
			}
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockResolvedValue(
				mockOrganization,
			)
			vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(
				null,
			)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(200)
			expect(data.error).toBeNull()
			expect(data.organization).toEqual({
				...mockOrganization,
				createdAt: mockOrganization.createdAt.toISOString(),
				updatedAt: mockOrganization.updatedAt.toISOString(),
			})
			expect(data.ssoConfig).toBeNull()
			expect(data.ssoAvailable).toBe(false)
			expect(ssoConfigurationService.getConfiguration).toHaveBeenCalledWith(
				mockOrganization.id,
			)
		})

		it('should return organization without SSO when SSO config is disabled', async () => {
			const email = 'user@example.com'
			const mockOrganization = {
				id: faker.string.uuid(),
				name: 'Example Corp',
				slug: 'example-corp',
				verifiedDomain: 'example.com',
				size: null,
				description: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				planName: null,
				stripeCustomerId: null,
				stripeProductId: null,
				stripeSubscriptionId: null,
				subscriptionStatus: null,
			}
			const mockSSOConfig = {
				id: faker.string.uuid(),
				organizationId: mockOrganization.id,
				providerName: 'Test Provider',
				issuerUrl: 'https://auth.example.com',
				clientId: 'test-client-id',
				clientSecret: 'encrypted-secret',
				scopes: 'openid email profile',
				autoDiscovery: true,
				pkceEnabled: true,
				isEnabled: false, // Disabled
				authorizationUrl: null,
				tokenUrl: null,
				userinfoUrl: null,
				revocationUrl: null,
				autoProvision: true,
				defaultRole: 'member',
				attributeMapping: null,
				lastTested: null,
				requireVerifiedEmail: false,
				allowedEmailDomains: null,
				enforceSSOLogin: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: null,
			}
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockResolvedValue(
				mockOrganization,
			)
			vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(
				mockSSOConfig,
			)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(200)
			expect(data.error).toBeNull()
			expect(data.organization).toEqual({
				...mockOrganization,
				createdAt: mockOrganization.createdAt.toISOString(),
				updatedAt: mockOrganization.updatedAt.toISOString(),
			})
			expect(data.ssoConfig).toBeNull()
			expect(data.ssoAvailable).toBe(false)
		})

		it('should return organization with SSO when SSO config is enabled', async () => {
			const email = 'user@example.com'
			const mockOrganization = {
				id: faker.string.uuid(),
				name: 'Example Corp',
				slug: 'example-corp',
				verifiedDomain: 'example.com',
				size: null,
				description: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				planName: null,
				stripeCustomerId: null,
				stripeProductId: null,
				stripeSubscriptionId: null,
				subscriptionStatus: null,
			}
			const mockSSOConfig = {
				id: faker.string.uuid(),
				organizationId: mockOrganization.id,
				providerName: 'Test Provider',
				issuerUrl: 'https://auth.example.com',
				clientId: 'test-client-id',
				clientSecret: 'encrypted-secret', // Should not be returned
				scopes: 'openid email profile',
				autoDiscovery: true,
				pkceEnabled: true,
				isEnabled: true, // Enabled
				authorizationUrl: null,
				tokenUrl: null,
				userinfoUrl: null,
				revocationUrl: null,
				autoProvision: true,
				defaultRole: 'member',
				attributeMapping: null,
				lastTested: null,
				requireVerifiedEmail: false,
				allowedEmailDomains: null,
				enforceSSOLogin: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: null,
			}
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockResolvedValue(
				mockOrganization,
			)
			vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(
				mockSSOConfig,
			)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(200)
			expect(data.error).toBeNull()
			expect(data.organization).toEqual({
				...mockOrganization,
				createdAt: mockOrganization.createdAt.toISOString(),
				updatedAt: mockOrganization.updatedAt.toISOString(),
			})
			expect(data.ssoConfig).toEqual({
				id: mockSSOConfig.id,
				providerName: mockSSOConfig.providerName,
				issuerUrl: mockSSOConfig.issuerUrl,
				clientId: mockSSOConfig.clientId,
				scopes: mockSSOConfig.scopes,
				autoDiscovery: mockSSOConfig.autoDiscovery,
				pkceEnabled: mockSSOConfig.pkceEnabled,
				isEnabled: mockSSOConfig.isEnabled,
			})
			expect(data.ssoAvailable).toBe(true)

			// Ensure sensitive data is not returned
			expect(data.ssoConfig.clientSecret).toBeUndefined()
		})

		it('should handle errors gracefully', async () => {
			// Mock console.error to prevent test setup from throwing
			vi.spyOn(console, 'error').mockImplementation(() => {})

			const email = 'user@example.com'
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockRejectedValue(
				new Error('Database error'),
			)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(500)
			expect(data.error).toBe('Failed to discover organization')
			expect(data.organization).toBeNull()
			expect(data.ssoConfig).toBeNull()
			expect(data.ssoAvailable).toBe(false)
		})

		it('should handle email with uppercase domain', async () => {
			const email = 'user@EXAMPLE.COM'
			const mockOrganization = {
				id: faker.string.uuid(),
				name: 'Example Corp',
				slug: 'example-corp',
				verifiedDomain: 'example.com',
				size: null,
				description: null,
				active: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				planName: null,
				stripeCustomerId: null,
				stripeProductId: null,
				stripeSubscriptionId: null,
				subscriptionStatus: null,
			}
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockResolvedValue(
				mockOrganization,
			)
			vi.mocked(ssoConfigurationService.getConfiguration).mockResolvedValue(
				null,
			)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(200)
			expect(data.organization).toEqual({
				...mockOrganization,
				createdAt: mockOrganization.createdAt.toISOString(),
				updatedAt: mockOrganization.updatedAt.toISOString(),
			})
			expect(discoverOrganizationFromEmail).toHaveBeenCalledWith(email)
		})

		it('should handle email with subdomain', async () => {
			const email = 'user@mail.example.com'
			const request = new Request(
				`http://localhost:3000/discover-org?email=${email}`,
			)

			vi.mocked(discoverOrganizationFromEmail).mockResolvedValue(null)

			const response = await loader({ request } as any)
			const data = (await response.json()) as DiscoverOrgResponse

			expect(response.status).toBe(200)
			expect(data.ssoAvailable).toBe(false)
			expect(discoverOrganizationFromEmail).toHaveBeenCalledWith(email)
		})
	})
})
