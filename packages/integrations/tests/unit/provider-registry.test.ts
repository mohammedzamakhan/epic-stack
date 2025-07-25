/**
 * Unit tests for provider registry and base provider functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
	ProviderRegistry,
	BaseIntegrationProvider,
	providerRegistry,
} from '../../src/provider'
import type {
	IntegrationProvider,
	TokenData,
	Channel,
	MessageData,
	OAuthCallbackParams,
	ProviderType,
} from '../../src/types'
import type { Integration, NoteIntegrationConnection } from '@prisma/client'

// Mock providers for testing
class MockCommunicationProvider extends BaseIntegrationProvider {
	readonly name = 'mock-communication'
	readonly type: ProviderType = 'communication'
	readonly displayName = 'Mock Communication Provider'
	readonly description = 'Mock provider for communication testing'
	readonly logoPath = '/mock-communication-logo.png'

	getAuthUrl = vi.fn()
	handleCallback = vi.fn()
	refreshToken = vi.fn()
	getAvailableChannels = vi.fn()
	postMessage = vi.fn()
	validateConnection = vi.fn()
	getConfigSchema = vi.fn()
}

class MockProductivityProvider extends BaseIntegrationProvider {
	readonly name = 'mock-productivity'
	readonly type: ProviderType = 'productivity'
	readonly displayName = 'Mock Productivity Provider'
	readonly description = 'Mock provider for productivity testing'
	readonly logoPath = '/mock-productivity-logo.png'

	getAuthUrl = vi.fn()
	handleCallback = vi.fn()
	refreshToken = vi.fn()
	getAvailableChannels = vi.fn()
	postMessage = vi.fn()
	validateConnection = vi.fn()
	getConfigSchema = vi.fn()
}

class MockTicketingProvider extends BaseIntegrationProvider {
	readonly name = 'mock-ticketing'
	readonly type: ProviderType = 'ticketing'
	readonly displayName = 'Mock Ticketing Provider'
	readonly description = 'Mock provider for ticketing testing'
	readonly logoPath = '/mock-ticketing-logo.png'

	getAuthUrl = vi.fn()
	handleCallback = vi.fn()
	refreshToken = vi.fn()
	getAvailableChannels = vi.fn()
	postMessage = vi.fn()
	validateConnection = vi.fn()
	getConfigSchema = vi.fn()
}

describe('ProviderRegistry', () => {
	let registry: ProviderRegistry
	let mockCommunicationProvider: MockCommunicationProvider
	let mockProductivityProvider: MockProductivityProvider
	let mockTicketingProvider: MockTicketingProvider

	beforeEach(() => {
		registry = new ProviderRegistry()
		mockCommunicationProvider = new MockCommunicationProvider()
		mockProductivityProvider = new MockProductivityProvider()
		mockTicketingProvider = new MockTicketingProvider()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('register', () => {
		it('should register a provider successfully', () => {
			registry.register(mockCommunicationProvider)

			expect(registry.has('mock-communication')).toBe(true)
			expect(registry.get('mock-communication')).toBe(mockCommunicationProvider)
		})

		it('should allow registering multiple providers', () => {
			registry.register(mockCommunicationProvider)
			registry.register(mockProductivityProvider)
			registry.register(mockTicketingProvider)

			expect(registry.has('mock-communication')).toBe(true)
			expect(registry.has('mock-productivity')).toBe(true)
			expect(registry.has('mock-ticketing')).toBe(true)
		})

		it('should overwrite existing provider with same name', () => {
			const firstProvider = mockCommunicationProvider
			const secondProvider = new MockCommunicationProvider()

			registry.register(firstProvider)
			registry.register(secondProvider)

			expect(registry.get('mock-communication')).toBe(secondProvider)
			expect(registry.get('mock-communication')).not.toBe(firstProvider)
		})
	})

	describe('get', () => {
		beforeEach(() => {
			registry.register(mockCommunicationProvider)
			registry.register(mockProductivityProvider)
		})

		it('should retrieve registered provider', () => {
			const provider = registry.get('mock-communication')

			expect(provider).toBe(mockCommunicationProvider)
			expect(provider.name).toBe('mock-communication')
			expect(provider.type).toBe('communication')
		})

		it('should throw error for non-existent provider', () => {
			expect(() => {
				registry.get('non-existent-provider')
			}).toThrow("Integration provider 'non-existent-provider' not found")
		})

		it('should be case-sensitive', () => {
			expect(() => {
				registry.get('Mock-Communication')
			}).toThrow("Integration provider 'Mock-Communication' not found")
		})
	})

	describe('getAll', () => {
		it('should return empty array when no providers registered', () => {
			const providers = registry.getAll()

			expect(providers).toEqual([])
		})

		it('should return all registered providers', () => {
			registry.register(mockCommunicationProvider)
			registry.register(mockProductivityProvider)
			registry.register(mockTicketingProvider)

			const providers = registry.getAll()

			expect(providers).toHaveLength(3)
			expect(providers).toContain(mockCommunicationProvider)
			expect(providers).toContain(mockProductivityProvider)
			expect(providers).toContain(mockTicketingProvider)
		})

		it('should return array copy (not reference)', () => {
			registry.register(mockCommunicationProvider)

			const providers1 = registry.getAll()
			const providers2 = registry.getAll()

			expect(providers1).not.toBe(providers2)
			expect(providers1).toEqual(providers2)
		})
	})

	describe('getByType', () => {
		beforeEach(() => {
			registry.register(mockCommunicationProvider)
			registry.register(mockProductivityProvider)
			registry.register(mockTicketingProvider)
		})

		it('should return providers of specific type', () => {
			const communicationProviders = registry.getByType('communication')

			expect(communicationProviders).toHaveLength(1)
			expect(communicationProviders[0]).toBe(mockCommunicationProvider)
		})

		it('should return empty array for type with no providers', () => {
			// Remove all providers and add only one type
			registry.unregister('mock-communication')
			registry.unregister('mock-productivity')
			registry.unregister('mock-ticketing')
			registry.register(mockCommunicationProvider)

			const ticketingProviders = registry.getByType('ticketing')

			expect(ticketingProviders).toEqual([])
		})

		it('should return multiple providers of same type', () => {
			// Create another communication provider
			const anotherCommProvider = new MockCommunicationProvider()
			anotherCommProvider.name = 'another-communication'
			registry.register(anotherCommProvider)

			const communicationProviders = registry.getByType('communication')

			expect(communicationProviders).toHaveLength(2)
			expect(communicationProviders).toContain(mockCommunicationProvider)
			expect(communicationProviders).toContain(anotherCommProvider)
		})

		it('should filter correctly by each provider type', () => {
			const productivityProviders = registry.getByType('productivity')
			const ticketingProviders = registry.getByType('ticketing')

			expect(productivityProviders).toHaveLength(1)
			expect(productivityProviders[0]).toBe(mockProductivityProvider)

			expect(ticketingProviders).toHaveLength(1)
			expect(ticketingProviders[0]).toBe(mockTicketingProvider)
		})
	})

	describe('has', () => {
		beforeEach(() => {
			registry.register(mockCommunicationProvider)
		})

		it('should return true for registered provider', () => {
			expect(registry.has('mock-communication')).toBe(true)
		})

		it('should return false for non-registered provider', () => {
			expect(registry.has('non-existent-provider')).toBe(false)
		})

		it('should be case-sensitive', () => {
			expect(registry.has('Mock-Communication')).toBe(false)
		})

		it('should return false after provider is unregistered', () => {
			registry.unregister('mock-communication')
			expect(registry.has('mock-communication')).toBe(false)
		})
	})

	describe('unregister', () => {
		beforeEach(() => {
			registry.register(mockCommunicationProvider)
			registry.register(mockProductivityProvider)
		})

		it('should unregister existing provider', () => {
			registry.unregister('mock-communication')

			expect(registry.has('mock-communication')).toBe(false)
			expect(registry.has('mock-productivity')).toBe(true)
		})

		it('should not throw error when unregistering non-existent provider', () => {
			expect(() => {
				registry.unregister('non-existent-provider')
			}).not.toThrow()
		})

		it('should remove provider from getAll results', () => {
			registry.unregister('mock-communication')

			const providers = registry.getAll()
			expect(providers).toHaveLength(1)
			expect(providers[0]).toBe(mockProductivityProvider)
		})

		it('should remove provider from getByType results', () => {
			registry.unregister('mock-communication')

			const communicationProviders = registry.getByType('communication')
			expect(communicationProviders).toEqual([])
		})
	})
})

describe('BaseIntegrationProvider', () => {
	let provider: MockCommunicationProvider

	beforeEach(() => {
		provider = new MockCommunicationProvider()
		vi.stubEnv(
			'INTEGRATIONS_OAUTH_STATE_SECRET',
			'test-secret-key-for-oauth-state-validation-12345',
		)
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.clearAllMocks()
	})

	describe('generateOAuthState', () => {
		it('should generate OAuth state with organization ID', () => {
			const organizationId = 'org-123'

			const state = provider['generateOAuthState'](organizationId)

			expect(state).toBeDefined()
			expect(typeof state).toBe('string')
			expect(state.length).toBeGreaterThan(0)
		})

		it('should include additional data in state', () => {
			const organizationId = 'org-123'
			const additionalData = { customField: 'value' }

			const state = provider['generateOAuthState'](
				organizationId,
				additionalData,
			)

			expect(state).toBeDefined()
			expect(typeof state).toBe('string')
		})

		it('should generate unique states', () => {
			const organizationId = 'org-123'

			const state1 = provider['generateOAuthState'](organizationId)
			const state2 = provider['generateOAuthState'](organizationId)

			expect(state1).not.toBe(state2)
		})
	})

	describe('parseOAuthState', () => {
		it('should parse valid OAuth state', () => {
			const organizationId = 'org-123'
			const state = provider['generateOAuthState'](organizationId)

			const parsed = provider['parseOAuthState'](state)

			expect(parsed.organizationId).toBe(organizationId)
			expect(parsed.providerName).toBe('mock-communication')
			expect(parsed.timestamp).toBeTypeOf('number')
		})

		it('should throw error for invalid state', () => {
			expect(() => {
				provider['parseOAuthState']('invalid-state')
			}).toThrow()
		})
	})

	describe('isTokenExpired', () => {
		it('should return false for token without expiry', () => {
			const result = provider['isTokenExpired'](undefined)

			expect(result).toBe(false)
		})

		it('should return false for valid token', () => {
			const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

			const result = provider['isTokenExpired'](expiresAt)

			expect(result).toBe(false)
		})

		it('should return true for expired token', () => {
			const expiresAt = new Date(Date.now() - 1000) // 1 second ago

			const result = provider['isTokenExpired'](expiresAt)

			expect(result).toBe(true)
		})

		it('should return true for token expiring within buffer', () => {
			const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now

			const result = provider['isTokenExpired'](expiresAt, 5) // 5 minute buffer

			expect(result).toBe(true)
		})

		it('should respect custom buffer time', () => {
			const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes from now

			const result = provider['isTokenExpired'](expiresAt, 1) // 1 minute buffer

			expect(result).toBe(false)
		})
	})

	describe('makeAuthenticatedRequest', () => {
		it('should throw not implemented error', async () => {
			const mockIntegration = {} as Integration

			await expect(
				provider['makeAuthenticatedRequest'](mockIntegration, '/test-endpoint'),
			).rejects.toThrow('makeAuthenticatedRequest not yet implemented')
		})
	})

	describe('handleApiError', () => {
		it('should throw error with status and status text', async () => {
			const mockResponse = {
				status: 404,
				statusText: 'Not Found',
				text: vi.fn().mockResolvedValue(''),
			} as unknown as Response

			await expect(
				provider['handleApiError'](mockResponse, 'Test context'),
			).rejects.toThrow('Test context: 404 Not Found')
		})

		it('should include JSON error message when available', async () => {
			const errorData = {
				error: 'invalid_request',
				message: 'Invalid parameters',
			}
			const mockResponse = {
				status: 400,
				statusText: 'Bad Request',
				text: vi.fn().mockResolvedValue(JSON.stringify(errorData)),
			} as unknown as Response

			await expect(
				provider['handleApiError'](mockResponse, 'Test context'),
			).rejects.toThrow('Test context: 400 Bad Request - invalid_request')
		})

		it('should include raw text when JSON parsing fails', async () => {
			const mockResponse = {
				status: 500,
				statusText: 'Internal Server Error',
				text: vi.fn().mockResolvedValue('Raw error text'),
			} as unknown as Response

			await expect(
				provider['handleApiError'](mockResponse, 'Test context'),
			).rejects.toThrow(
				'Test context: 500 Internal Server Error - Raw error text',
			)
		})

		it('should handle empty response text', async () => {
			const mockResponse = {
				status: 503,
				statusText: 'Service Unavailable',
				text: vi.fn().mockResolvedValue(''),
			} as unknown as Response

			await expect(
				provider['handleApiError'](mockResponse, 'Test context'),
			).rejects.toThrow('Test context: 503 Service Unavailable')
		})
	})
})

describe('Global provider registry', () => {
	let mockProvider: MockCommunicationProvider

	beforeEach(() => {
		mockProvider = new MockCommunicationProvider()
	})

	afterEach(() => {
		// Clean up global registry
		if (providerRegistry.has('mock-communication')) {
			providerRegistry.unregister('mock-communication')
		}
		vi.clearAllMocks()
	})

	it('should be a singleton instance', () => {
		const registry1 = providerRegistry
		const registry2 = providerRegistry

		expect(registry1).toBe(registry2)
	})

	it('should allow registration and retrieval', () => {
		providerRegistry.register(mockProvider)

		expect(providerRegistry.has('mock-communication')).toBe(true)
		expect(providerRegistry.get('mock-communication')).toBe(mockProvider)
	})

	it('should persist across different imports', async () => {
		providerRegistry.register(mockProvider)

		// Simulate different import
		const { providerRegistry: importedRegistry } = await import(
			'../../src/provider'
		)

		expect(importedRegistry.has('mock-communication')).toBe(true)
		expect(importedRegistry.get('mock-communication')).toBe(mockProvider)
	})
})
