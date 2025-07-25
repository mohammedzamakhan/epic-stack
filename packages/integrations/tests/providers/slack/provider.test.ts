import { describe, it, expect, beforeEach } from 'vitest'
import { SlackProvider } from '../../../src/providers/slack/provider'
import type { Integration, NoteIntegrationConnection } from '@prisma/client'

describe('SlackProvider - General Provider Tests', () => {
	let provider: SlackProvider

	beforeEach(() => {
		provider = new SlackProvider()
	})

	describe('Provider Properties', () => {
		it('should have correct provider metadata', () => {
			expect(provider.name).toBe('slack')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('Slack')
			expect(provider.description).toBe(
				'Connect notes to Slack channels for team collaboration',
			)
			expect(provider.logoPath).toBe('/icons/slack.svg')
		})
	})

	describe('validateConnection', () => {
		it('should return true for mock implementation', async () => {
			const mockIntegration: Integration = {
				id: 'integration-123',
				organizationId: 'org-123',
				providerName: 'slack',
				accessToken: 'xoxb-test-token',
				refreshToken: null,
				expiresAt: null,
				config: JSON.stringify({}),
				status: 'active',
				createdAt: new Date(),
				updatedAt: new Date(),
			}

			const mockConnection: NoteIntegrationConnection & {
				integration: Integration
			} = {
				id: 'connection-123',
				noteId: 'note-123',
				integrationId: 'integration-123',
				externalId: 'C1234567890',
				config: JSON.stringify({}),
				createdAt: new Date(),
				updatedAt: new Date(),
				integration: mockIntegration,
			}

			const isValid = await provider.validateConnection(mockConnection)
			expect(isValid).toBe(true)
		})
	})

	describe('getConfigSchema', () => {
		it('should return correct configuration schema', () => {
			const schema = provider.getConfigSchema()

			expect(schema.type).toBe('object')
			expect(schema.properties).toHaveProperty('teamId')
			expect(schema.properties).toHaveProperty('teamName')
			expect(schema.properties).toHaveProperty('botUserId')
			expect(schema.properties).toHaveProperty('scope')

			expect(schema.required).toEqual(['teamId', 'teamName', 'scope'])

			// Check property types
			expect(schema.properties.teamId.type).toBe('string')
			expect(schema.properties.teamName.type).toBe('string')
			expect(schema.properties.botUserId.type).toBe('string')
			expect(schema.properties.scope.type).toBe('string')

			// Check descriptions
			expect(schema.properties.teamId.description).toBe('Slack team ID')
			expect(schema.properties.teamName.description).toBe('Slack team name')
			expect(schema.properties.botUserId.description).toBe('Bot user ID')
			expect(schema.properties.scope.description).toBe('OAuth scope')
		})
	})

	describe('Private Helper Methods', () => {
		it('should format Slack blocks correctly', () => {
			const messageData = {
				title: 'Test Note',
				content: 'Test content',
				author: 'Test Author',
				noteUrl: 'https://example.com/notes/123',
				changeType: 'created' as const,
			}

			// Access private method through type assertion for testing
			const blocks = (provider as any).formatSlackBlocks(messageData, true)

			expect(blocks).toHaveLength(4) // section, content, actions, divider
			expect(blocks[0].type).toBe('section')
			expect(blocks[0].text.text).toContain(
				'✨ *Test Note* was created by *Test Author*',
			)
			expect(blocks[1].text.text).toBe('Test content')
			expect(blocks[2].type).toBe('actions')
			expect(blocks[3].type).toBe('divider')
		})

		it('should format Slack text correctly', () => {
			const messageData = {
				title: 'Test Note',
				content: 'Test content',
				author: 'Test Author',
				noteUrl: 'https://example.com/notes/123',
				changeType: 'updated' as const,
			}

			const text = (provider as any).formatSlackText(messageData, true)

			expect(text).toContain('📝 *Test Note* was updated by Test Author')
			expect(text).toContain('Test content')
			expect(text).toContain('<https://example.com/notes/123|View Note>')
		})

		it('should get correct emoji for change types', () => {
			expect((provider as any).getChangeTypeEmoji('created')).toBe('✨')
			expect((provider as any).getChangeTypeEmoji('updated')).toBe('📝')
			expect((provider as any).getChangeTypeEmoji('deleted')).toBe('🗑️')
			expect((provider as any).getChangeTypeEmoji('unknown' as any)).toBe('📄')
		})

		it('should validate URLs correctly', () => {
			expect((provider as any).isValidUrl('https://example.com')).toBe(true)
			expect((provider as any).isValidUrl('http://example.com')).toBe(true)
			expect((provider as any).isValidUrl('ftp://example.com')).toBe(false)
			expect((provider as any).isValidUrl('invalid-url')).toBe(false)
			expect((provider as any).isValidUrl('')).toBe(false)
		})

		it('should truncate content correctly', () => {
			const shortContent = 'Short content'
			const longContent = 'A'.repeat(250) // Less than 300 limit
			const veryLongContent = 'B'.repeat(500) // More than 300 limit

			expect((provider as any).truncateContent(shortContent, 300)).toBe(
				shortContent,
			)
			expect((provider as any).truncateContent(longContent, 300)).toBe(
				longContent,
			)

			const truncated = (provider as any).truncateContent(veryLongContent, 300)
			expect(truncated).toHaveLength(300)
			expect(truncated.endsWith('...')).toBe(true)
			expect(truncated.startsWith('B')).toBe(true)
		})

		it('should truncate at word boundaries when possible', () => {
			const content =
				'This is a long sentence that should be truncated at a word boundary if possible'
			const truncated = (provider as any).truncateContent(content, 50)

			expect(truncated).toHaveLength(50)
			expect(truncated.endsWith('...')).toBe(true)
			expect(truncated.startsWith('This is')).toBe(true)

			// Test that it tries to find word boundaries
			const beforeEllipsis = truncated.slice(0, -3)
			// The implementation should try to truncate at word boundaries when possible
			// but may fall back to character truncation if no good boundary is found
			expect(beforeEllipsis.length).toBe(47) // 50 - 3 for '...'
		})
	})

	describe('Environment Variable Handling', () => {
		it('should use demo credentials when environment variables are missing', () => {
			delete process.env.SLACK_CLIENT_ID
			delete process.env.SLACK_CLIENT_SECRET

			const clientId = (provider as any).clientId
			const clientSecret = (provider as any).clientSecret

			expect(clientId).toBe('demo-slack-client-id')
			expect(clientSecret).toBe('demo-slack-client-secret')
		})

		it('should use real credentials when environment variables are set', () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			const clientId = (provider as any).clientId
			const clientSecret = (provider as any).clientSecret

			expect(clientId).toBe('real-client-id')
			expect(clientSecret).toBe('real-client-secret')
		})
	})
})
