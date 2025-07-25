/**
 * Error scenarios integration tests
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

describe('Error Scenarios Integration Tests', () => {
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

	describe('API Error Recovery', () => {
		it('should handle channel retrieval errors with fallback', async () => {
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

			// Mock success logging (Slack provider has fallback behavior)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({
				id: 'log-success',
				integrationId: 'slack-integration-123',
				action: 'fetch_channels',
				status: 'success',
				requestData: null,
				responseData: null,
				errorMessage: null,
				createdAt: new Date(),
			})

			// Mock API error by overriding MSW handler
			const { server } = await import('../setup')
			const { http, HttpResponse } = await import('msw')

			server.use(
				http.get('https://slack.com/api/conversations.list', () => {
					return HttpResponse.json(
						{ ok: false, error: 'invalid_auth' },
						{ status: 401 },
					)
				}),
			)

			// The Slack provider has fallback behavior, so it returns demo channels instead of throwing
			const channels = await integrationService.getAvailableChannels(
				'slack-integration-123',
			)

			expect(channels).toHaveLength(2)
			expect(channels[0].metadata.demo).toBe(true)
			expect(channels[0].metadata.fallback_reason).toContain('Slack API error')

			// Verify activity was logged (success with fallback)
			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					integrationId: 'slack-integration-123',
					action: 'fetch_channels',
					status: 'success',
				}),
			})
		})

		it('should handle database connection errors', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock database error for integration lookup
			vi.mocked(prisma.integration.findUnique).mockRejectedValue(
				new Error('Database query failed'),
			)

			await expect(
				integrationService.getAvailableChannels('slack-integration-123'),
			).rejects.toThrow('Database query failed')
		})

		it('should handle logging failures gracefully', async () => {
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

			// Mock logging failure (should not affect main operation)
			vi.mocked(prisma.integrationLog.create).mockRejectedValue(
				new Error('Logging failed'),
			)

			// Should still succeed despite logging failure
			const channels = await integrationService.getAvailableChannels(
				'slack-integration-123',
			)

			expect(channels).toHaveLength(2)
			expect(channels[0].name).toBe('general')
		})
	})

	describe('Provider Error Handling', () => {
		it('should handle unknown provider errors', async () => {
			await expect(
				integrationService.initiateOAuth(
					'org-123',
					'unknown-provider',
					'https://example.com/callback',
				),
			).rejects.toThrow("Integration provider 'unknown-provider' not found")
		})

		it('should handle provider method failures with fallback', async () => {
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

			// Mock success logging (Slack provider has fallback behavior)
			vi.mocked(prisma.integrationLog.create).mockResolvedValue({
				id: 'log-success',
				integrationId: 'slack-integration-123',
				action: 'fetch_channels',
				status: 'success',
				requestData: null,
				responseData: null,
				errorMessage: null,
				createdAt: new Date(),
			})

			// Mock provider method failure
			const { server } = await import('../setup')
			const { http, HttpResponse } = await import('msw')

			server.use(
				http.get('https://slack.com/api/conversations.list', () => {
					return HttpResponse.json(
						{ ok: false, error: 'internal_error' },
						{ status: 500 },
					)
				}),
			)

			// The Slack provider has fallback behavior, so it returns demo channels instead of throwing
			const channels = await integrationService.getAvailableChannels(
				'slack-integration-123',
			)

			expect(channels).toHaveLength(2)
			expect(channels[0].metadata.demo).toBe(true)
			expect(channels[0].metadata.fallback_reason).toContain('Slack API error')

			// Verify activity was logged (success with fallback)
			expect(prisma.integrationLog.create).toHaveBeenCalledWith({
				data: expect.objectContaining({
					integrationId: 'slack-integration-123',
					action: 'fetch_channels',
					status: 'success',
				}),
			})
		})
	})

	describe('Validation Error Recovery', () => {
		it('should handle integration validation failures', async () => {
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

			// Mock note lookup with different organization
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue({
				id: 'note-123',
				organizationId: 'different-org-456', // Different organization
				title: 'Test Note',
				content: 'Test content',
				createdAt: new Date(),
				updatedAt: new Date(),
				organization: { id: 'different-org-456', name: 'Different Org' },
			})

			await expect(
				integrationService.connectNoteToChannel(
					'note-123',
					'slack-integration-123',
					'C1234567890',
				),
			).rejects.toThrow(
				'Note and integration must belong to the same organization',
			)
		})

		it('should handle missing integration errors', async () => {
			const { prisma } = await import('@repo/prisma')

			// Mock integration not found
			vi.mocked(prisma.integration.findUnique).mockResolvedValue(null)

			await expect(
				integrationService.getAvailableChannels('non-existent-integration'),
			).rejects.toThrow('Integration not found or inactive')
		})
	})
})
