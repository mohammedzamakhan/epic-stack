/**
 * Provider interactions integration tests
 */

// Mock Prisma first
vi.mock('@repo/prisma', () => ({
	prisma: {
		integration: {
			create: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn(),
		},
		noteIntegrationConnection: {
			create: vi.fn(),
			findUnique: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn(),
		},
		integrationLog: {
			create: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
			findFirst: vi.fn(),
		},
		organizationNote: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
		},
		user: {
			findUnique: vi.fn(),
		},
	},
}))

// Mock encryption
vi.mock('../../src/encryption', () => ({
	encryptToken: vi
		.fn()
		.mockImplementation((token: string) => `encrypted_${token}`),
	decryptToken: vi
		.fn()
		.mockImplementation((token: string) => token.replace('encrypted_', '')),
}))

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { integrationService } from '../../src/service'
import { integrationManager } from '../../src/integration-manager'

describe('Provider Interactions Integration Tests', () => {
	beforeEach(async () => {
		vi.clearAllMocks()

		// Set up environment variables
		process.env.SLACK_CLIENT_ID = 'test-slack-client-id'
		process.env.SLACK_CLIENT_SECRET = 'test-slack-client-secret'
		process.env.JIRA_CLIENT_ID = 'test-jira-client-id'
		process.env.JIRA_CLIENT_SECRET = 'test-jira-client-secret'

		// Register providers dynamically
		const { SlackProvider } = await import('../../src/providers/slack/provider')
		const { JiraProvider } = await import('../../src/providers/jira/provider')
		integrationManager.registerProvider(new SlackProvider())
		integrationManager.registerProvider(new JiraProvider())
	})

	describe('Channel Retrieval', () => {
		it('should retrieve Slack channels successfully', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock integration lookup
			vi.mocked(prisma.integration.findUnique).mockResolvedValue({
				id: 'slack-integration-123',
				organizationId: 'org-123',
				providerName: 'slack',
				providerType: 'productivity',
				accessToken: 'encrypted_xoxb-test-slack-token',
				refreshToken: null,
				tokenExpiresAt: null,
				config: JSON.stringify({ scope: 'channels:read,chat:write' }),
				isActive: true,
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'org-123', name: 'Test Org' },
				connections: [],
			})

			// Mock activity logging
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({
				id: 'log-123',
				integrationId: 'slack-integration-123',
				action: 'fetch_channels',
				status: 'success',
				requestData: JSON.stringify({ channelCount: 2 }),
				responseData: null,
				errorMessage: null,
				createdAt: new Date(),
			})

			const channels = await integrationService.getAvailableChannels(
				'slack-integration-123',
			)

			expect(channels).toHaveLength(2)
			expect(channels[0].name).toBe('general')
			expect(channels[0].type).toBe('public')
			expect(channels[1].name).toBe('random')

			// Verify activity was logged
			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					integrationId: 'slack-integration-123',
					action: 'fetch_channels',
					status: 'success',
				}),
			})
		})

		it('should retrieve Jira projects as channels', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock integration lookup
			vi.mocked(prisma.integration.findUnique).mockResolvedValue({
				id: 'jira-integration-456',
				organizationId: 'org-123',
				providerName: 'jira',
				providerType: 'productivity',
				accessToken: 'encrypted_test-jira-access-token',
				refreshToken: 'encrypted_test-jira-refresh-token',
				tokenExpiresAt: new Date(Date.now() + 3600000),
				config: JSON.stringify({
					scope: 'read:jira-work write:jira-work',
					instanceUrl: 'https://test.atlassian.net',
				}),
				isActive: true,
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'org-123', name: 'Test Org' },
				connections: [],
			})

			// Mock activity logging
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({
				id: 'log-456',
				integrationId: 'jira-integration-456',
				action: 'fetch_channels',
				status: 'success',
				requestData: JSON.stringify({ channelCount: 2 }),
				responseData: null,
				errorMessage: null,
				createdAt: new Date(),
			})

			const channels = await integrationService.getAvailableChannels(
				'jira-integration-456',
			)

			expect(channels).toHaveLength(2)
			expect(channels[0].name).toBe('TEST - Test Project')
			expect(channels[0].type).toBe('public')
			expect(channels[0].id).toBe('TEST')
			expect(channels[1].name).toBe('DEMO - Demo Project')
			expect(channels[1].id).toBe('DEMO')

			// Verify activity was logged
			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					integrationId: 'jira-integration-456',
					action: 'fetch_channels',
					status: 'success',
				}),
			})
		})

		it('should handle inactive integrations', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock inactive integration
			vi.mocked(prisma.integration.findUnique).mockResolvedValue({
				id: 'inactive-integration',
				organizationId: 'org-123',
				providerName: 'slack',
				providerType: 'productivity',
				accessToken: 'encrypted_token',
				refreshToken: null,
				tokenExpiresAt: null,
				config: '{}',
				isActive: false, // Inactive
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			await expect(
				integrationService.getAvailableChannels('inactive-integration'),
			).rejects.toThrow('Integration not found or inactive')
		})
	})

	describe('Message Posting', () => {
		it('should post message to Slack channel', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock note and user data
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue({
				id: 'note-123',
				organizationId: 'org-123',
				title: 'Test Note',
				content: 'This is test content',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			vi.mocked(prisma.user.findUnique).mockResolvedValue({
				id: 'user-123',
				name: 'Test User',
				username: 'testuser',
				email: 'test@example.com',
			})

			// Mock connection with integration
			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue([
				{
					id: 'connection-123',
					noteId: 'note-123',
					integrationId: 'slack-integration-123',
					externalId: 'C1234567890',
					config: JSON.stringify({
						channelName: 'general',
						channelType: 'public',
					}),
					isActive: true,
					lastPostedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
					integration: {
						id: 'slack-integration-123',
						organizationId: 'org-123',
						providerName: 'slack',
						providerType: 'productivity',
						accessToken: 'encrypted_xoxb-test-slack-token',
						refreshToken: null,
						tokenExpiresAt: null,
						config: JSON.stringify({ scope: 'channels:read,chat:write' }),
						isActive: true,
						lastSyncAt: new Date(),
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				},
			])

			// Mock connection update
			vi.mocked(prisma.noteIntegrationConnection.update).mockResolvedValue({
				id: 'connection-123',
				noteId: 'note-123',
				integrationId: 'slack-integration-123',
				externalId: 'C1234567890',
				config: '{}',
				isActive: true,
				lastPostedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Mock activity logging
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({
				id: 'log-post',
				integrationId: 'slack-integration-123',
				action: 'post_message',
				status: 'success',
				requestData: JSON.stringify({
					noteId: 'note-123',
					channelId: 'C1234567890',
					changeType: 'created',
				}),
				responseData: null,
				errorMessage: null,
				createdAt: new Date(),
			})

			// Handle note update (which triggers message posting)
			await integrationService.handleNoteUpdate(
				'note-123',
				'created',
				'user-123',
			)

			// Verify connection was updated with last posted time
			expect(prisma.noteIntegrationConnection.update).toHaveBeenCalledWith({
				where: { id: 'connection-123' },
				data: { lastPostedAt: expect.any(Date) },
			})

			// Verify activity was logged
			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					integrationId: 'slack-integration-123',
					action: 'post_message',
					status: 'success',
				}),
			})
		})

		it('should handle notes with no connections', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock empty connections
			vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue([])

			// Should complete without error
			await integrationService.handleNoteUpdate(
				'note-123',
				'created',
				'user-123',
			)

			// Verify no database operations were performed
			expect(prisma.organizationNote.findUnique).not.toHaveBeenCalled()
			expect(prisma.user.findUnique).not.toHaveBeenCalled()
			expect(prisma.integrationLog.create).not.toHaveBeenCalled()
		})
	})

	describe('Connection Management', () => {
		it('should create note-to-channel connections', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock integration lookup
			vi.mocked(prisma.integration.findUnique).mockResolvedValue({
				id: 'slack-integration-123',
				organizationId: 'org-123',
				providerName: 'slack',
				providerType: 'productivity',
				accessToken: 'encrypted_xoxb-test-slack-token',
				refreshToken: null,
				tokenExpiresAt: null,
				config: JSON.stringify({ scope: 'channels:read,chat:write' }),
				isActive: true,
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'org-123', name: 'Test Org' },
				connections: [],
			})

			// Mock note lookup
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue({
				id: 'note-123',
				organizationId: 'org-123',
				title: 'Test Note',
				content: 'Test content',
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'org-123', name: 'Test Org' },
			})

			// Mock connection creation
			vi.mocked(prisma.noteIntegrationConnection.create).mockResolvedValue({
				id: 'new-connection',
				noteId: 'note-123',
				integrationId: 'slack-integration-123',
				externalId: 'C1234567890',
				config: JSON.stringify({
					channelName: 'general',
					channelType: 'public',
				}),
				isActive: true,
				lastPostedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			// Mock activity logging
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({
				id: 'log-connection',
				integrationId: 'slack-integration-123',
				action: 'connection_create',
				status: 'success',
				requestData: JSON.stringify({
					noteId: 'note-123',
					channelId: 'C1234567890',
					channelName: 'general',
				}),
				responseData: null,
				errorMessage: null,
				createdAt: new Date(),
			})

			const connection = await integrationService.connectNoteToChannel(
				'note-123',
				'slack-integration-123',
				'C1234567890',
			)

			expect(connection).toBeDefined()
			expect(connection.noteId).toBe('note-123')
			expect(connection.integrationId).toBe('slack-integration-123')
			expect(connection.externalId).toBe('C1234567890')

			// Verify connection was created
			expect(prisma.noteIntegrationConnection.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					noteId: 'note-123',
					integrationId: 'slack-integration-123',
					externalId: 'C1234567890',
					isActive: true,
				}),
			})

			// Verify activity was logged
			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					integrationId: 'slack-integration-123',
					action: 'connection_create',
					status: 'success',
				}),
			})
		})

		it('should validate channel exists before creating connection', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock integration lookup
			vi.mocked(prisma.integration.findUnique).mockResolvedValue({
				id: 'slack-integration-123',
				organizationId: 'org-123',
				providerName: 'slack',
				providerType: 'productivity',
				accessToken: 'encrypted_xoxb-test-slack-token',
				refreshToken: null,
				tokenExpiresAt: null,
				config: JSON.stringify({ scope: 'channels:read,chat:write' }),
				isActive: true,
				lastSyncAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'org-123', name: 'Test Org' },
				connections: [],
			})

			// Mock note lookup
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue({
				id: 'note-123',
				organizationId: 'org-123',
				title: 'Test Note',
				content: 'Test content',
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'org-123', name: 'Test Org' },
			})

			// Try to connect to non-existent channel
			await expect(
				integrationService.connectNoteToChannel(
					'note-123',
					'slack-integration-123',
					'INVALID_CHANNEL',
				),
			).rejects.toThrow('Channel not found or not accessible')

			// Verify no connection was created
			expect(prisma.noteIntegrationConnection.create).not.toHaveBeenCalled()
		})
	})
})
