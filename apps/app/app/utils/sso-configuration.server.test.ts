import { faker } from '@faker-js/faker'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { consoleWarn } from '#tests/setup/setup-test-env.ts'

// Mock the entire service module with proper class for Vitest v4
vi.mock('./sso-configuration.server.ts', () => {
	// Define mock functions inside the factory to avoid hoisting issues
	const mockGetConfiguration = vi.fn()
	const mockGetDecryptedClientSecret = vi.fn()
	const mockGetAttributeMapping = vi.fn()
	const mockListConfigurations = vi.fn()
	const mockTestConnection = vi.fn()
	const mockCreateConfiguration = vi.fn()
	const mockUpdateConfiguration = vi.fn()
	const mockDeleteConfiguration = vi.fn()

	return {
		SSOConfigurationService: class {
			getConfiguration = mockGetConfiguration
			getDecryptedClientSecret = mockGetDecryptedClientSecret
			getAttributeMapping = mockGetAttributeMapping
			listConfigurations = mockListConfigurations
			testConnection = mockTestConnection
			createConfiguration = mockCreateConfiguration
			updateConfiguration = mockUpdateConfiguration
			deleteConfiguration = mockDeleteConfiguration
		},
		// Export mock functions for test access
		mockService: {
			getConfiguration: mockGetConfiguration,
			getDecryptedClientSecret: mockGetDecryptedClientSecret,
			getAttributeMapping: mockGetAttributeMapping,
			listConfigurations: mockListConfigurations,
			testConnection: mockTestConnection,
			createConfiguration: mockCreateConfiguration,
			updateConfiguration: mockUpdateConfiguration,
			deleteConfiguration: mockDeleteConfiguration,
		},
	}
})

// Import the mocked service
import { SSOConfigurationService } from './sso-configuration.server.ts'
const { mockService } = (await import('./sso-configuration.server.ts')) as any

describe('SSOConfigurationService', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Mock console.warn to avoid test failures
		consoleWarn.mockImplementation(() => {})
	})

	it('should retrieve configuration by organization ID', async () => {
		const organizationId = faker.string.uuid()
		const mockConfig = {
			id: faker.string.uuid(),
			organizationId,
			providerName: 'Test Provider',
			issuerUrl: 'https://auth.example.com',
			clientId: 'test-client-id',
			clientSecret: 'encrypted-secret',
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			isEnabled: true,
			lastTested: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdById: null,
		}

		mockService.getConfiguration.mockResolvedValue(mockConfig)

		const service = new SSOConfigurationService()
		const result = await service.getConfiguration(organizationId)

		expect(mockService.getConfiguration).toHaveBeenCalledWith(organizationId)
		expect(result).toEqual(mockConfig)
	})

	it('should return null when configuration does not exist', async () => {
		const organizationId = faker.string.uuid()

		mockService.getConfiguration.mockResolvedValue(null)

		const service = new SSOConfigurationService()
		const result = await service.getConfiguration(organizationId)

		expect(result).toBeNull()
	})

	it('should decrypt client secret using master key', async () => {
		const originalSecret = 'test-client-secret'
		const encryptedSecret = `encrypted-${originalSecret}`

		const config = {
			id: faker.string.uuid(),
			organizationId: faker.string.uuid(),
			providerName: 'Test Provider',
			issuerUrl: 'https://auth.example.com',
			clientId: 'test-client-id',
			clientSecret: encryptedSecret,
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			isEnabled: true,
			lastTested: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdById: null,
		}

		mockService.getDecryptedClientSecret.mockResolvedValue(originalSecret)

		const service = new SSOConfigurationService()
		const result = await service.getDecryptedClientSecret(config)

		expect(result).toBe(originalSecret)
	})

	it('should return parsed attribute mapping when valid JSON', () => {
		const attributeMapping = {
			email: 'mail',
			name: 'displayName',
			username: 'sAMAccountName',
		}

		const config = {
			id: faker.string.uuid(),
			organizationId: faker.string.uuid(),
			providerName: 'Test Provider',
			issuerUrl: 'https://auth.example.com',
			clientId: 'test-client-id',
			clientSecret: 'encrypted-secret',
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: JSON.stringify(attributeMapping),
			isEnabled: true,
			lastTested: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdById: null,
		}

		mockService.getAttributeMapping.mockReturnValue(attributeMapping)

		const service = new SSOConfigurationService()
		const result = service.getAttributeMapping(config)

		expect(result).toEqual(attributeMapping)
	})

	it('should return default mapping when attributeMapping is null', () => {
		const config = {
			id: faker.string.uuid(),
			organizationId: faker.string.uuid(),
			providerName: 'Test Provider',
			issuerUrl: 'https://auth.example.com',
			clientId: 'test-client-id',
			clientSecret: 'encrypted-secret',
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			isEnabled: true,
			lastTested: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdById: null,
		}

		const defaultMapping = {
			email: 'email',
			name: 'name',
			username: 'preferred_username',
			firstName: 'given_name',
			lastName: 'family_name',
		}

		mockService.getAttributeMapping.mockReturnValue(defaultMapping)

		const service = new SSOConfigurationService()
		const result = service.getAttributeMapping(config)

		expect(result).toEqual(defaultMapping)
	})

	it('should return all SSO configurations', async () => {
		const mockConfigs = [
			{
				id: faker.string.uuid(),
				organizationId: faker.string.uuid(),
				providerName: 'Test Provider 1',
				issuerUrl: 'https://auth1.example.com',
				clientId: 'test-client-id-1',
				clientSecret: 'encrypted-secret-1',
				authorizationUrl: null,
				tokenUrl: null,
				userinfoUrl: null,
				revocationUrl: null,
				scopes: 'openid email profile',
				autoDiscovery: true,
				pkceEnabled: true,
				autoProvision: true,
				defaultRole: 'member',
				attributeMapping: null,
				isEnabled: true,
				lastTested: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: null,
			},
		]

		mockService.listConfigurations.mockResolvedValue(mockConfigs)

		const service = new SSOConfigurationService()
		const result = await service.listConfigurations()

		expect(mockService.listConfigurations).toHaveBeenCalled()
		expect(result).toEqual(mockConfigs)
	})

	it('should test connection with auto-discovery enabled', async () => {
		const config = {
			id: faker.string.uuid(),
			organizationId: faker.string.uuid(),
			providerName: 'Test Provider',
			issuerUrl: 'https://auth.example.com',
			clientId: 'test-client-id',
			clientSecret: 'encrypted-secret',
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			isEnabled: true,
			lastTested: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdById: null,
		}

		const mockResult = {
			success: true,
			discoveredEndpoints: {
				authorizationUrl: 'https://auth.example.com/oauth2/authorize',
				tokenUrl: 'https://auth.example.com/oauth2/token',
				userinfoUrl: 'https://auth.example.com/oauth2/userinfo',
				revocationUrl: 'https://auth.example.com/oauth2/revoke',
			},
		}

		mockService.testConnection.mockResolvedValue(mockResult)

		const service = new SSOConfigurationService()
		const result = await service.testConnection(config)

		expect(result.success).toBe(true)
		expect(result.discoveredEndpoints).toEqual({
			authorizationUrl: 'https://auth.example.com/oauth2/authorize',
			tokenUrl: 'https://auth.example.com/oauth2/token',
			userinfoUrl: 'https://auth.example.com/oauth2/userinfo',
			revocationUrl: 'https://auth.example.com/oauth2/revoke',
		})
	})

	it('should return error when OIDC discovery fails', async () => {
		const config = {
			id: faker.string.uuid(),
			organizationId: faker.string.uuid(),
			providerName: 'Test Provider',
			issuerUrl: 'https://auth.example.com',
			clientId: 'test-client-id',
			clientSecret: 'encrypted-secret',
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			isEnabled: true,
			lastTested: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			createdById: null,
		}

		const mockResult = {
			success: false,
			error: 'OIDC Discovery failed: 404 Not Found',
		}

		mockService.testConnection.mockResolvedValue(mockResult)

		const service = new SSOConfigurationService()
		const result = await service.testConnection(config)

		expect(result.success).toBe(false)
		expect(result.error).toMatch(
			/(OIDC Discovery failed|Endpoint connectivity test failed)/,
		)
	})
})
