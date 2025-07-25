/**
 * Tests for LinearProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../setup'
import { LinearProvider } from '../../../src/providers/linear/provider'
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

describe('LinearProvider', () => {
	let provider: LinearProvider

	beforeEach(() => {
		// Set required environment variables
		process.env.LINEAR_CLIENT_ID = 'test-client-id'
		process.env.LINEAR_CLIENT_SECRET = 'test-client-secret'

		provider = new LinearProvider()
		vi.clearAllMocks()

		// Reset the mock for decryptToken
		vi.mocked(decryptToken).mockResolvedValue('access-token')
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Provider Properties', () => {
		it('should have correct provider properties', () => {
			expect(provider.name).toBe('linear')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('Linear')
			expect(provider.description).toBe(
				'Connect notes to Linear teams and projects for issue tracking and project management',
			)
		})
	})

	describe('getAuthUrl', () => {
		it('should generate correct auth URL', async () => {
			const organizationId = 'org-123'
			const redirectUri = 'https://example.com/callback'

			const authUrl = await provider.getAuthUrl(organizationId, redirectUri)

			expect(authUrl).toContain('https://linear.app/oauth/authorize')
			expect(authUrl).toContain('client_id=')
			expect(authUrl).toContain('redirect_uri=')
			expect(authUrl).toContain('response_type=code')
			expect(authUrl).toContain('scope=')
			expect(authUrl).toContain('state=')
		})
	})

	describe('handleCallback', () => {
		it('should handle successful OAuth callback', async () => {
			// Generate a proper OAuth state using bracket notation to access protected method
			const state = (provider as any).generateOAuthState('org-123', {
				redirectUri: 'https://example.com/callback',
			})

			// Override MSW handlers for token exchange and user info
			server.use(
				http.post('https://api.linear.app/oauth/token', () => {
					return HttpResponse.json({
						access_token: 'linear-access-token',
						token_type: 'Bearer',
						expires_in: 315360000,
						scope: 'read write',
					})
				}),
				http.post('https://api.linear.app/graphql', async ({ request }) => {
					const body = (await request.json()) as any
					const query = body.query

					if (query.includes('viewer')) {
						return HttpResponse.json({
							data: {
								viewer: {
									id: 'user-123',
									name: 'Test User',
									displayName: 'Test User',
									email: 'test@example.com',
									avatarUrl: 'https://example.com/avatar.jpg',
								},
							},
						})
					}

					return HttpResponse.json({ data: {} })
				}),
			)

			const params = {
				organizationId: 'org-123',
				code: 'auth-code',
				state: state,
			}

			const tokenData = await provider.handleCallback(params)

			expect(tokenData.accessToken).toBe('linear-access-token')
			expect(tokenData.expiresAt).toBeInstanceOf(Date)
			expect(tokenData.scope).toBe('read write')
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
				'OAuth error: User denied access',
			)
		})
	})

	describe('getAvailableChannels', () => {
		it('should fetch available teams as channels', async () => {
			const mockIntegration = {
				id: 'integration-123',
				accessToken: 'encrypted-access-token',
				organizationId: 'org-123',
				providerName: 'linear',
				isActive: true,
			} as any

			const channels = await provider.getAvailableChannels(mockIntegration)

			// The mock returns 1 team and 0 projects, so we expect 1 channel
			expect(channels).toHaveLength(1)
			expect(channels[0]).toEqual({
				id: 'team:team-123',
				name: 'Engineering (Team)',
				type: 'public',
				metadata: {
					type: 'team',
					teamId: 'team-123',
					teamKey: 'ENG',
					color: undefined,
					description: undefined,
				},
			})
		})

		it('should handle API errors when fetching channels', async () => {
			const mockIntegration = {
				id: 'integration-123',
				accessToken: null,
				organizationId: 'org-123',
				providerName: 'linear',
				isActive: true,
			} as any

			await expect(
				provider.getAvailableChannels(mockIntegration),
			).rejects.toThrow('No access token found for integration')
		})
	})

	describe('postMessage', () => {
		it('should create issue successfully', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'team:team-123',
				config: JSON.stringify({
					channelId: 'team:team-123',
					channelName: 'Engineering',
					channelType: 'team',
					includeNoteContent: true,
				}),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'linear',
					isActive: true,
				},
			} as any

			// Override MSW handler for issue creation
			server.use(
				http.post('https://api.linear.app/graphql', async ({ request }) => {
					const body = (await request.json()) as any
					const query = body.query

					if (query.includes('issueCreate')) {
						return HttpResponse.json({
							data: {
								issueCreate: {
									success: true,
									issue: {
										id: 'issue-123',
										identifier: 'ENG-1',
										title: '✨ Test Note',
										description:
											'Test content\n\nView note: https://example.com/notes/123',
										url: 'https://linear.app/team/issue/ENG-1',
									},
								},
							},
						})
					}

					return HttpResponse.json({ data: {} })
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

		it('should handle issue creation errors', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'team:team-123',
				config: JSON.stringify({
					channelId: 'team:team-123',
					includeNoteContent: true,
				}),
				integration: {
					id: 'integration-123',
					accessToken: null,
					organizationId: 'org-123',
					providerName: 'linear',
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
			).rejects.toThrow('No access token found for integration')
		})
	})

	describe('validateConnection', () => {
		it('should validate connection successfully', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'team:team-123',
				config: JSON.stringify({ channelId: 'team:team-123' }),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'linear',
					isActive: true,
				},
			} as any

			// Override MSW handler for team validation
			server.use(
				http.post('https://api.linear.app/graphql', async ({ request }) => {
					const body = (await request.json()) as any
					const query = body.query

					if (query.includes('team(')) {
						return HttpResponse.json({
							data: {
								team: {
									id: 'team-123',
									name: 'Engineering',
									key: 'ENG',
								},
							},
						})
					}

					return HttpResponse.json({ data: {} })
				}),
			)

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(true)
		})

		it('should return false for invalid connection', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'invalid-team',
				config: JSON.stringify({ channelId: 'invalid-team' }),
				integration: {
					id: 'integration-123',
					accessToken: null,
					organizationId: 'org-123',
					providerName: 'linear',
					isActive: true,
				},
			} as any

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(false)
		})

		it('should handle validation errors', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: 'team:team-123',
				config: JSON.stringify({ channelId: 'team:team-123' }),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'linear',
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
				'Linear does not support token refresh. Please re-authenticate.',
			)
		})
	})

	describe('Error Handling', () => {
		it('should handle missing environment variables', async () => {
			delete process.env.LINEAR_CLIENT_ID

			await expect(
				provider.getAuthUrl('org-123', 'http://localhost:3000/callback'),
			).rejects.toThrow('LINEAR_CLIENT_ID environment variable is not set')
		})
	})
})
