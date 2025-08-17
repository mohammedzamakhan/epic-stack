/**
 * Test to verify test helpers are working correctly
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
	MockProvider,
	MockIntegrationRepository,
	MockConnectionRepository,
	createTestIntegration,
	createTestConnection,
	createTestMessage,
	createTestOAuthParams,
	createTestTokenData,
	createTestChannels,
	setupTestEnvironment,
	expectToThrow,
} from './test-helpers'

describe('Test Helpers', () => {
	describe('MockProvider', () => {
		let mockProvider: MockProvider

		beforeEach(() => {
			mockProvider = new MockProvider()
		})

		it('should have correct provider properties', () => {
			expect(mockProvider.name).toBe('mock')
			expect(mockProvider.type).toBe('productivity')
			expect(mockProvider.displayName).toBe('Mock Provider')
			expect(mockProvider.description).toBe('Mock provider for testing')
			expect(mockProvider.logoPath).toBe('/icons/mock.svg')
		})

		it('should have mock implementations for all methods', () => {
			expect(mockProvider.getAuthUrl).toBeDefined()
			expect(mockProvider.handleCallback).toBeDefined()
			expect(mockProvider.refreshToken).toBeDefined()
			expect(mockProvider.getAvailableChannels).toBeDefined()
			expect(mockProvider.postMessage).toBeDefined()
			expect(mockProvider.validateConnection).toBeDefined()
			expect(mockProvider.getConfigSchema).toBeDefined()
		})

		it('should return mocked values', async () => {
			const authUrl = await mockProvider.getAuthUrl(
				'org-123',
				'https://callback.com',
			)
			expect(authUrl).toBe('https://mock.com/oauth/authorize?state=test')

			const channels = await mockProvider.getAvailableChannels()
			expect(channels).toHaveLength(1)
			expect(channels[0].name).toBe('Mock Channel 1')

			const isValid = await mockProvider.validateConnection()
			expect(isValid).toBe(true)
		})
	})

	describe('MockIntegrationRepository', () => {
		let repo: MockIntegrationRepository

		beforeEach(() => {
			repo = new MockIntegrationRepository()
		})

		it('should create and retrieve integrations', async () => {
			const integration = await repo.create({
				organizationId: 'org-123',
				providerName: 'test',
				accessToken: 'token',
				refreshToken: null,
				expiresAt: null,
				config: '{}',
				status: 'active',
			})

			expect(integration.id).toBeDefined()
			expect(integration.organizationId).toBe('org-123')

			const retrieved = await repo.findById(integration.id)
			expect(retrieved).toEqual(integration)
		})

		it('should update integrations', async () => {
			const integration = await repo.create({
				organizationId: 'org-123',
				providerName: 'test',
				accessToken: 'token',
				refreshToken: null,
				expiresAt: null,
				config: '{}',
				status: 'active',
			})

			const updated = await repo.update(integration.id, { status: 'inactive' })
			expect(updated.status).toBe('inactive')
		})
	})

	describe('Factory Functions', () => {
		it('should create test integration with defaults', () => {
			const integration = createTestIntegration()
			expect(integration.id).toBe('integration-123')
			expect(integration.organizationId).toBe('org-123')
			expect(integration.providerName).toBe('mock')
		})

		it('should create test integration with overrides', () => {
			const integration = createTestIntegration({
				organizationId: 'custom-org',
				providerName: 'custom-provider',
			})
			expect(integration.organizationId).toBe('custom-org')
			expect(integration.providerName).toBe('custom-provider')
		})

		it('should create test message data', () => {
			const message = createTestMessage()
			expect(message.title).toBe('Test Note Title')
			expect(message.author).toBe('Test Author')
			expect(message.changeType).toBe('created')
		})

		it('should create test channels', () => {
			const channels = createTestChannels(3)
			expect(channels).toHaveLength(3)
			expect(channels[0].name).toBe('Test Channel 1')
			expect(channels[0].type).toBe('public')
			expect(channels[1].type).toBe('private')
		})
	})

	describe('Utility Functions', () => {
		it('should setup test environment', () => {
			const { mockDate, cleanup } = setupTestEnvironment()
			expect(mockDate).toBeInstanceOf(Date)

			// Test that console methods are mocked
			console.log('test')
			expect(console.log).toHaveBeenCalledWith('test')

			cleanup()
		})

		it('should test error throwing', async () => {
			const error = await expectToThrow(() => {
				throw new Error('Test error')
			}, 'Test error')
			expect(error.message).toBe('Test error')
		})

		it('should test async error throwing', async () => {
			const error = await expectToThrow(async () => {
				throw new Error('Async error')
			}, /Async/)
			expect(error.message).toMatch(/Async/)
		})
	})
})
