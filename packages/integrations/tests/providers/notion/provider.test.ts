/**
 * Tests for NotionProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../setup'
import { NotionProvider } from '../../../src/providers/notion/provider'
import type { MessageData } from '../../../src/types'

// Mock the encryption module
vi.mock('../../../src/encryption', async () => {
	const actual = await vi.importActual('../../../src/encryption')
	return {
		...actual,
		decryptToken: vi.fn().mockResolvedValue('access-token'),
	}
})

import { decryptToken } from '../../../src/encryption'

describe('NotionProvider', () => {
	let provider: NotionProvider

	beforeEach(() => {
		// Set required environment variables
		process.env.NOTION_CLIENT_ID = 'test-client-id'
		process.env.NOTION_CLIENT_SECRET = 'test-client-secret'

		provider = new NotionProvider()
		vi.clearAllMocks()

		// Reset the mock for decryptToken
		vi.mocked(decryptToken).mockResolvedValue('access-token')
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Provider Properties', () => {
		it('should have correct provider properties', () => {
			expect(provider.name).toBe('notion')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('Notion')
			expect(provider.description).toBe(
				'Connect notes to Notion databases for knowledge management and collaboration',
			)
		})
	})

	describe('getAuthUrl', () => {
		it('should generate correct auth URL', async () => {
			const organizationId = 'org-123'
			const redirectUri = 'https://example.com/callback'

			const authUrl = await provider.getAuthUrl(organizationId, redirectUri)

			expect(authUrl).toContain('https://api.notion.com/v1/oauth/authorize')
			expect(authUrl).toContain('client_id=')
			expect(authUrl).toContain('redirect_uri=')
			expect(authUrl).toContain('response_type=code')
			expect(authUrl).toContain('state=')
		})
	})

	describe('handleCallback', () => {
		it('should handle successful OAuth callback', async () => {
			// Generate a proper OAuth state using bracket notation to access protected method
			const state = (provider as any).generateOAuthState('org-123', {
				redirectUri: 'https://example.com/callback',
			})

			// Override MSW handler for token exchange
			server.use(
				http.post('https://api.notion.com/v1/oauth/token', () => {
					return HttpResponse.json({
						access_token: 'notion-access-token',
						token_type: 'bearer',
						bot_id: 'bot-123',
						workspace_id: 'workspace-123',
						workspace_name: 'My Workspace',
						workspace_icon: 'https://example.com/icon.png',
						owner: {
							type: 'user',
							user: {
								id: 'user-123',
								name: 'Test User',
								avatar_url: 'https://example.com/avatar.jpg',
								type: 'person',
								person: {
									email: 'test@example.com',
								},
							},
						},
						request_id: 'req-123',
					})
				}),
			)

			const params = {
				organizationId: 'org-123',
				code: 'auth-code',
				state: state,
			}

			const tokenData = await provider.handleCallback(params)

			expect(tokenData.accessToken).toBe('notion-access-token')
			expect(tokenData.metadata).toEqual({
				workspaceId: 'workspace-123',
				workspaceName: 'My Workspace',
				botId: 'bot-123',
				user: {
					id: 'user-123',
					name: 'Test User',
					email: 'test@example.com',
					avatarUrl: 'https://example.com/avatar.jpg',
				},
			})
		})

		it('should handle OAuth error response', async () => {
			const params = {
				organizationId: 'org-123',
				code: '',
				state: 'invalid-state',
				error: 'access_denied',
				errorDescription: 'User denied access',
			}

			await expect(provider.handleCallback(params)).rejects.toThrow(
				'Invalid state: malformed structure',
			)
		})
	})

	describe('getAvailableChannels', () => {
		it('should fetch available databases as channels', async () => {
			const mockIntegration = {
				id: 'integration-123',
				accessToken: 'encrypted-access-token',
				organizationId: 'org-123',
				providerName: 'notion',
				isActive: true,
			} as any

			// Override MSW handler for database search
			server.use(
				http.post('https://api.notion.com/v1/search', () => {
					return HttpResponse.json({
						object: 'list',
						results: [
							{
								id: 'database-123',
								object: 'database',
								title: [
									{
										type: 'text',
										text: {
											content: 'My Database',
										},
										plain_text: 'My Database',
									},
								],
								url: 'https://notion.so/database-123',
								icon: null,
								last_edited_time: '2023-01-01T00:00:00.000Z',
								properties: {
									Name: {
										type: 'title',
									},
									Status: {
										type: 'select',
									},
								},
							},
							{
								id: 'database-456',
								object: 'database',
								title: [
									{
										type: 'text',
										text: {
											content: 'Another Database',
										},
										plain_text: 'Another Database',
									},
								],
								url: 'https://notion.so/database-456',
								icon: null,
								last_edited_time: '2023-01-01T00:00:00.000Z',
								properties: {
									Title: {
										type: 'title',
									},
								},
							},
						],
						next_cursor: null,
						has_more: false,
						type: 'page_or_database',
						page_or_database: {},
						request_id: 'req-123',
					})
				}),
			)

			const channels = await provider.getAvailableChannels(mockIntegration)

			expect(channels).toHaveLength(2)
			expect(channels[0]).toEqual({
				id: 'database-123',
				name: 'My Database',
				type: 'public',
				metadata: {
					url: 'https://notion.so/database-123',
					icon: null,
					lastEditedTime: '2023-01-01T00:00:00.000Z',
				},
			})
			expect(channels[1]).toEqual({
				id: 'database-456',
				name: 'Another Database',
				type: 'public',
				metadata: {
					url: 'https://notion.so/database-456',
					icon: null,
					lastEditedTime: '2023-01-01T00:00:00.000Z',
				},
			})
		})

		it('should handle API errors when fetching channels', async () => {
			const mockIntegration = {
				id: 'integration-123',
				accessToken: null,
				organizationId: 'org-123',
				providerName: 'notion',
				isActive: true,
			} as any

			await expect(
				provider.getAvailableChannels(mockIntegration),
			).rejects.toThrow('No access token available')
		})
	})

	describe('postMessage', () => {
		it('should create page successfully', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'database-123',
				config: JSON.stringify({
					databaseId: 'database-123',
					databaseName: 'My Database',
					includeNoteContent: true,
				}),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'notion',
					isActive: true,
				},
			} as any

			// Override MSW handler for page creation
			server.use(
				http.post('https://api.notion.com/v1/pages', () => {
					return HttpResponse.json({
						id: 'page-123',
						object: 'page',
						url: 'https://notion.so/page-123',
						properties: {
							Name: {
								title: [
									{
										text: {
											content: 'Test Note',
										},
									},
								],
							},
						},
						request_id: 'req-123',
					})
				}),
			)

			const messageData: MessageData = {
				title: 'Test Note',
				content: 'Test content',
				author: 'John Doe',
				noteUrl: 'https://example.com/notes/123',
				changeType: 'created',
			}

			await provider.postMessage(mockConnection, messageData)

			// The test passes if no error is thrown
			expect(true).toBe(true)
		})

		it('should handle page creation errors', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'database-123',
				config: JSON.stringify({
					databaseId: 'database-123',
					includeNoteContent: true,
				}),
				integration: {
					id: 'integration-123',
					accessToken: null,
					organizationId: 'org-123',
					providerName: 'notion',
					isActive: true,
				},
			} as any

			const messageData: MessageData = {
				title: 'Test Note',
				content: 'Test content',
				author: 'John Doe',
				noteUrl: 'https://example.com/notes/123',
				changeType: 'created',
			}

			await expect(
				provider.postMessage(mockConnection, messageData),
			).rejects.toThrow('No access token available')
		})
	})

	describe('validateConnection', () => {
		it('should validate connection successfully', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'database-123',
				config: JSON.stringify({ databaseId: 'database-123' }),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'notion',
					isActive: true,
				},
			} as any

			// Override MSW handler for database validation
			server.use(
				http.get('https://api.notion.com/v1/databases/database-123', () => {
					return HttpResponse.json({
						id: 'database-123',
						object: 'database',
						title: [
							{
								type: 'text',
								text: {
									content: 'My Database',
								},
								plain_text: 'My Database',
							},
						],
						url: 'https://notion.so/database-123',
						request_id: 'req-123',
					})
				}),
			)

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(true)
		})

		it('should return false for invalid connection', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'invalid-database',
				config: JSON.stringify({ databaseId: 'invalid-database' }),
				integration: {
					id: 'integration-123',
					accessToken: null,
					organizationId: 'org-123',
					providerName: 'notion',
					isActive: true,
				},
			} as any

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(false)
		})

		it('should handle validation errors', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'database-123',
				config: JSON.stringify({ databaseId: 'database-123' }),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'notion',
					isActive: true,
				},
			} as any

			// Mock decryptToken to throw an error
			vi.mocked(decryptToken).mockRejectedValueOnce(
				new Error('Decryption error'),
			)

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(false)
		})
	})

	describe('refreshToken', () => {
		it('should throw error for token refresh', async () => {
			await expect(provider.refreshToken('refresh-token')).rejects.toThrow(
				'Notion does not support token refresh. Users must re-authenticate.',
			)
		})
	})

	describe('Error Handling', () => {
		it('should handle missing environment variables', async () => {
			delete process.env.NOTION_CLIENT_ID

			await expect(
				provider.getAuthUrl('org-123', 'http://localhost:3000/callback'),
			).rejects.toThrow('NOTION_CLIENT_ID environment variable is required')
		})
	})
})
