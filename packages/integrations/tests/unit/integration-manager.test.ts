import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IntegrationManager } from '../../src/integration-manager'
import { providerRegistry } from '../../src/provider'
import {
	MockProvider,
	createTestIntegration,
	createTestChannels,
} from '../utils/test-helpers'
import { prisma } from '@repo/prisma'

// Mock Prisma
vi.mock('@repo/prisma', () => ({
	prisma: {
		integration: {
			create: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		noteIntegrationConnection: {
			create: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			deleteMany: vi.fn(),
			delete: vi.fn(),
			update: vi.fn(),
		},
		organizationNote: {
			findUnique: vi.fn(),
		},
		user: {
			findUnique: vi.fn(),
		},
		integrationLog: {
			create: vi.fn(),
			findMany: vi.fn(),
			deleteMany: vi.fn(),
			count: vi.fn(),
			findFirst: vi.fn(),
		},
	},
}))

// Mock encryption module
vi.mock('../../src/encryption', () => ({
	encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
	decryptToken: vi.fn().mockResolvedValue('decrypted-token'),
}))

describe('IntegrationManager', () => {
	let manager: IntegrationManager
	let mockProvider: MockProvider

	beforeEach(() => {
		manager = IntegrationManager.getInstance()
		mockProvider = new MockProvider()
		vi.clearAllMocks()
	})

	afterEach(() => {
		providerRegistry.unregister('mock')
	})

	describe('Singleton Pattern', () => {
		it('should return the same instance', () => {
			const instance1 = IntegrationManager.getInstance()
			const instance2 = IntegrationManager.getInstance()
			expect(instance1).toBe(instance2)
		})
	})

	describe('Provider Registry Management', () => {
		it('should register and get providers', () => {
			manager.registerProvider(mockProvider)
			expect(manager.getProvider('mock')).toBe(mockProvider)
			expect(manager.getAllProviders()).toContain(mockProvider)
			expect(manager.getProvidersByType('productivity')).toContain(mockProvider)
		})
	})

	describe('OAuth Flow Management', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should initiate OAuth flow', async () => {
			mockProvider.getAuthUrl.mockResolvedValue(
				'https://example.com/auth?state=test-state',
			)

			const result = await manager.initiateOAuth(
				'org-123',
				'mock',
				'http://callback.com',
			)

			expect(result.authUrl).toBe('https://example.com/auth?state=test-state')
			expect(result.state).toBe('test-state')
		})

		it('should handle OAuth callback with OAuth 1.0a state', async () => {
			const mockIntegration = createTestIntegration()
			const mockTokenData = {
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
				expiresAt: new Date(Date.now() + 3600000),
				scope: 'read write',
			}

			mockProvider.handleCallback.mockResolvedValue(mockTokenData)
			vi.mocked(prisma.integration.create).mockResolvedValue(mockIntegration)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			const result = await manager.handleOAuthCallback('mock', {
				code: 'auth-code',
				state: 'trello-oauth1-12345',
				organizationId: 'org-123',
			})

			expect(result).toEqual(mockIntegration)
		})
	})

	describe('Integration CRUD Operations', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should create integration', async () => {
			const mockIntegration = createTestIntegration()
			vi.mocked(prisma.integration.create).mockResolvedValue(mockIntegration)

			const result = await manager.createIntegration({
				organizationId: 'org-123',
				providerName: 'mock',
				tokenData: {
					accessToken: 'access-token',
					refreshToken: 'refresh-token',
					expiresAt: new Date(),
					scope: 'read write',
				},
			})

			expect(result).toEqual(mockIntegration)
		})

		it('should get integration by ID', async () => {
			const mockIntegration = createTestIntegration()
			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)

			const result = await manager.getIntegration('integration-123')
			expect(result).toEqual(mockIntegration)
		})

		it('should get organization integrations with type filter', async () => {
			const mockIntegrations = [createTestIntegration()]
			vi.mocked(prisma.integration.findMany).mockResolvedValue(mockIntegrations)

			const result = await manager.getOrganizationIntegrations(
				'org-123',
				'communication',
			)
			expect(result).toEqual(mockIntegrations)
		})

		it('should update integration config', async () => {
			const mockIntegration = createTestIntegration()
			vi.mocked(prisma.integration.update).mockResolvedValue(mockIntegration)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			const result = await manager.updateIntegrationConfig('integration-123', {
				setting: 'value',
			})
			expect(result).toEqual(mockIntegration)
		})

		it('should disconnect integration', async () => {
			const mockIntegration = createTestIntegration()
			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)
			vi.mocked(prisma.noteIntegrationConnection.deleteMany).mockResolvedValue({
				count: 2,
			})
			vi.mocked(prisma.integrationLog.deleteMany).mockResolvedValue({
				count: 5,
			})
			vi.mocked(prisma.integration.delete).mockResolvedValue(mockIntegration)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			await manager.disconnectIntegration('integration-123')

			expect(prisma.integration.delete).toHaveBeenCalled()
		})
	})

	describe('Connection Management', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should connect note to channel', async () => {
			const mockIntegration = createTestIntegration()
			const mockNote = {
				id: 'note-123',
				organizationId: 'org-123',
				title: 'Test Note',
				content: 'Test content',
				organization: { id: 'org-123' },
			}
			const mockConnection = {
				id: 'connection-123',
				noteId: 'note-123',
				integrationId: 'integration-123',
				externalId: 'channel-123',
				config: '{}',
				isActive: true,
			}
			const mockChannels = createTestChannels(1)

			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockNote as any,
			)
			// Mock getAvailableChannels to return channels that include the externalId we're looking for
			const mockChannelsWithTarget = [
				...mockChannels,
				{ id: 'channel-123', name: 'Target Channel', type: 'public' as const },
			]
			mockProvider.getAvailableChannels.mockResolvedValue(
				mockChannelsWithTarget,
			)
			vi.mocked(prisma.noteIntegrationConnection.create).mockResolvedValue(
				mockConnection as any,
			)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			const result = await manager.connectNoteToChannel({
				noteId: 'note-123',
				integrationId: 'integration-123',
				externalId: 'channel-123',
			})

			expect(result).toEqual(mockConnection)
		})

		it('should disconnect note from channel', async () => {
			const mockConnection = {
				id: 'connection-123',
				noteId: 'note-123',
				integrationId: 'integration-123',
				externalId: 'channel-123',
				integration: createTestIntegration(),
				note: { id: 'note-123' },
			}

			vi.mocked(prisma.noteIntegrationConnection.findUnique).mockResolvedValue(
				mockConnection as any,
			)
			vi.mocked(prisma.noteIntegrationConnection.delete).mockResolvedValue(
				mockConnection as any,
			)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			await manager.disconnectNoteFromChannel('connection-123')
			expect(prisma.noteIntegrationConnection.delete).toHaveBeenCalled()
		})

		it('should get note connections', async () => {
			const mockConnections = [
				{
					id: 'connection-123',
					noteId: 'note-123',
					integrationId: 'integration-123',
					integration: createTestIntegration(),
					note: { id: 'note-123' },
				},
			]

			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(
				mockConnections as any,
			)

			const result = await manager.getNoteConnections('note-123')
			expect(result).toEqual(mockConnections)
		})
	})

	describe('Channel Operations', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should get available channels', async () => {
			const mockIntegration = createTestIntegration()
			const mockChannels = createTestChannels(1)

			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)
			mockProvider.getAvailableChannels.mockResolvedValue(mockChannels)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			const result = await manager.getAvailableChannels('integration-123')
			expect(result).toEqual(mockChannels)
		})

		it('should handle channel fetch error', async () => {
			const mockIntegration = createTestIntegration()
			const error = new Error('API Error')

			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)
			mockProvider.getAvailableChannels.mockRejectedValue(error)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			await expect(
				manager.getAvailableChannels('integration-123'),
			).rejects.toThrow('API Error')
		})
	})

	describe('Message Posting', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should handle note update with connections', async () => {
			const mockConnections = [
				{
					id: 'connection-123',
					noteId: 'note-123',
					integrationId: 'integration-123',
					externalId: 'channel-123',
					integration: createTestIntegration(),
					note: { id: 'note-123' },
				},
			]
			const mockNote = {
				id: 'note-123',
				title: 'Test Note',
				content: 'Test content',
			}
			const mockUser = {
				id: 'user-123',
				name: 'Test User',
				username: 'testuser',
			}

			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(
				mockConnections as any,
			)
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockNote as any,
			)
			vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
			mockProvider.postMessage.mockResolvedValue(undefined)
			vi.mocked(prisma.noteIntegrationConnection.update).mockResolvedValue(
				{} as any,
			)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			await manager.handleNoteUpdate('note-123', 'updated', 'user-123')

			expect(mockProvider.postMessage).toHaveBeenCalled()
		})

		it('should handle note update with no connections', async () => {
			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue([])

			await manager.handleNoteUpdate('note-123', 'updated', 'user-123')

			expect(prisma.organizationNote.findUnique).not.toHaveBeenCalled()
		})
	})

	describe('Token Management', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should refresh integration tokens', async () => {
			const mockIntegration = {
				...createTestIntegration(),
				refreshToken: 'encrypted-refresh-token',
			}
			const mockTokenData = {
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiresAt: new Date(Date.now() + 3600000),
				scope: 'read write',
			}

			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)
			mockProvider.refreshToken.mockResolvedValue(mockTokenData)
			vi.mocked(prisma.integration.update).mockResolvedValue(mockIntegration)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			const result = await manager.refreshIntegrationTokens('integration-123')
			expect(result).toEqual(mockIntegration)
		})
	})

	describe('Validation and Health Checks', () => {
		beforeEach(() => {
			manager.registerProvider(mockProvider)
		})

		it('should validate integration connections', async () => {
			const mockConnections = [
				{
					id: 'connection-123',
					noteId: 'note-123',
					integrationId: 'integration-123',
					integration: createTestIntegration(),
				},
			]

			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(
				mockConnections as any,
			)
			mockProvider.validateConnection.mockResolvedValue(true)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			const result =
				await manager.validateIntegrationConnections('integration-123')

			expect(result).toEqual({
				valid: 1,
				invalid: 0,
				errors: [],
			})
		})

		it('should get integration status', async () => {
			const mockIntegration = {
				...createTestIntegration(),
				isActive: true,
				lastSyncAt: new Date(),
				connections: [{ id: 'conn-1' }, { id: 'conn-2' }],
			}

			vi.mocked(prisma.integration.findUnique).mockResolvedValue(
				mockIntegration,
			)
			vi.mocked(prisma.integrationLog.findMany).mockResolvedValue([])

			const result = await manager.getIntegrationStatus('integration-123')

			expect(result.status).toBe('active')
			expect(result.connectionCount).toBe(2)
		})

		it('should get integration stats', async () => {
			const mockConnections = [
				{ id: 'conn-1', isActive: true },
				{ id: 'conn-2', isActive: false },
			]

			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(
				mockConnections as any,
			)
			vi.mocked(prisma.integrationLog.count)
				.mockResolvedValueOnce(10)
				.mockResolvedValueOnce(2)
			vi.mocked(prisma.integrationLog.findFirst).mockResolvedValue({
				createdAt: new Date(),
			} as any)

			const result = await manager.getIntegrationStats('integration-123')

			expect(result).toEqual({
				totalConnections: 2,
				activeConnections: 1,
				recentActivity: 10,
				lastActivity: expect.any(Date),
				errorCount: 2,
			})
		})
	})

	describe('Logging', () => {
		it('should log integration activity', async () => {
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

			await manager.logIntegrationActivity(
				'integration-123',
				'test_action',
				'success',
				{ key: 'value' },
			)

			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: {
					integrationId: 'integration-123',
					action: 'test_action',
					status: 'success',
					requestData: JSON.stringify({ key: 'value' }),
					errorMessage: undefined,
					createdAt: expect.any(Date),
				},
			})
		})
	})
})
