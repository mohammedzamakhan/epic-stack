/**
 * Tests for GitHubProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../setup'
import { GitHubProvider } from '../../../src/providers/github/provider'
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

describe('GitHubProvider', () => {
	let provider: GitHubProvider

	beforeEach(() => {
		// Set required environment variables
		process.env.GITHUB_INTEGRATION_CLIENT_ID = 'test-client-id'
		process.env.GITHUB_INTEGRATION_CLIENT_SECRET = 'test-client-secret'
		process.env.INTEGRATIONS_OAUTH_STATE_SECRET =
			'test-secret-key-for-oauth-state-validation-12345678'

		provider = new GitHubProvider()
		vi.clearAllMocks()

		// Reset the mock for decryptToken
		vi.mocked(decryptToken).mockResolvedValue('access-token')
	})

	afterEach(() => {
		vi.restoreAllMocks()
		// Clean up environment variables
		delete process.env.GITHUB_INTEGRATION_CLIENT_ID
		delete process.env.GITHUB_INTEGRATION_CLIENT_SECRET
		delete process.env.INTEGRATIONS_OAUTH_STATE_SECRET
	})

	describe('Provider Properties', () => {
		it('should have correct provider properties', () => {
			expect(provider.name).toBe('github')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('GitHub')
			expect(provider.description).toBe(
				'Connect notes to GitHub repositories for issue tracking and project management',
			)
		})
	})

	describe('getAuthUrl', () => {
		it('should generate correct auth URL', async () => {
			const organizationId = 'org-123'
			const redirectUri = 'https://example.com/callback'

			const authUrl = await provider.getAuthUrl(organizationId, redirectUri)

			expect(authUrl).toContain('https://github.com/login/oauth/authorize')
			expect(authUrl).toContain('client_id=')
			expect(authUrl).toContain('redirect_uri=')
			expect(authUrl).toContain('scope=')
			expect(authUrl).toContain('state=')
		})
	})

	describe('handleCallback', () => {
		it('should handle successful OAuth callback', async () => {
			// Generate a proper OAuth state
			const state = (provider as any).generateOAuthState('org-123', {
				redirectUri: 'https://example.com/callback',
			})

			// Override MSW handlers for token exchange and user info
			server.use(
				http.post('https://github.com/login/oauth/access_token', () => {
					return HttpResponse.json({
						access_token: 'github-access-token',
						token_type: 'bearer',
						scope: 'repo',
					})
				}),
				http.get('https://api.github.com/user', () => {
					return HttpResponse.json({
						id: 123,
						login: 'testuser',
						name: 'Test User',
						email: 'test@example.com',
						avatar_url: 'https://example.com/avatar.jpg',
					})
				}),
			)

			const params = {
				organizationId: 'org-123',
				code: 'auth-code',
				state: state,
			}

			const tokenData = await provider.handleCallback(params)

			expect(tokenData.accessToken).toBe('github-access-token')
			expect(tokenData.scope).toBe('repo')
			expect(tokenData.metadata).toBeUndefined()
		})

		it('should handle OAuth error response', async () => {
			const params = {
				organizationId: 'org-123',
				code: '',
				state: 'state',
				error: 'access_denied',
				errorDescription: 'User denied access',
			}

			await expect(provider.handleCallback(params)).rejects.toThrow(
				'GitHub OAuth error: access_denied - User denied access',
			)
		})
	})

	describe('getAvailableChannels', () => {
		it('should fetch available repositories as channels', async () => {
			const mockIntegration = {
				id: 'integration-123',
				accessToken: 'encrypted-access-token',
				organizationId: 'org-123',
				providerName: 'github',
				isActive: true,
			} as any

			// Override MSW handler for repositories API
			server.use(
				http.get('https://api.github.com/user/repos', () => {
					return HttpResponse.json([
						{
							id: 123,
							name: 'my-repo',
							full_name: 'user/my-repo',
							description: 'Test repository',
							html_url: 'https://github.com/user/my-repo',
							clone_url: 'https://github.com/user/my-repo.git',
							ssh_url: 'git@github.com:user/my-repo.git',
							default_branch: 'main',
							owner: {
								id: 1,
								login: 'user',
								avatar_url: 'https://github.com/user.png',
								type: 'User' as const,
							},
							private: false,
							archived: false,
							disabled: false,
							has_issues: true,
							permissions: {
								admin: true,
								push: true,
								pull: true,
							},
						},
						{
							id: 456,
							name: 'private-repo',
							full_name: 'user/private-repo',
							description: 'Private test repository',
							html_url: 'https://github.com/user/private-repo',
							clone_url: 'https://github.com/user/private-repo.git',
							ssh_url: 'git@github.com:user/private-repo.git',
							default_branch: 'main',
							owner: {
								id: 1,
								login: 'user',
								avatar_url: 'https://github.com/user.png',
								type: 'User' as const,
							},
							private: true,
							archived: false,
							disabled: false,
							has_issues: true,
							permissions: {
								admin: false,
								push: true,
								pull: true,
							},
						},
					])
				}),
			)

			const channels = await provider.getAvailableChannels(mockIntegration)

			expect(channels).toHaveLength(2)
			// Just check that we have the expected structure, don't check exact metadata
			expect(channels[0]).toEqual({
				id: '123',
				name: 'user/my-repo',
				type: 'public',
				metadata: expect.objectContaining({
					repositoryName: 'my-repo',
					repositoryFullName: 'user/my-repo',
					ownerName: 'user',
					isPrivate: false,
				}),
			})
			expect(channels[1]).toEqual({
				id: '456',
				name: 'user/private-repo',
				type: 'private',
				metadata: expect.objectContaining({
					repositoryName: 'private-repo',
					repositoryFullName: 'user/private-repo',
					ownerName: 'user',
					isPrivate: true,
				}),
			})
		})

		it('should handle API errors when fetching channels', async () => {
			const mockIntegration = {
				id: 'integration-123',
				accessToken: null,
				organizationId: 'org-123',
				providerName: 'github',
				isActive: true,
			} as any

			await expect(
				provider.getAvailableChannels(mockIntegration),
			).rejects.toThrow('No access token available for GitHub integration')
		})
	})

	describe('postMessage', () => {
		it('should create issue successfully', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: '123',
				config: JSON.stringify({
					repositoryId: '123',
					repositoryName: 'my-repo',
					repositoryFullName: 'user/my-repo',
					ownerName: 'user',
					includeNoteContent: true,
				}),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'github',
					isActive: true,
				},
			} as any

			// Override MSW handler for issue creation
			server.use(
				http.post('https://api.github.com/repos/user/my-repo/issues', () => {
					return HttpResponse.json({
						id: 456,
						number: 1,
						title: 'Test Note',
						body: 'Test content\n\nView note: https://example.com/notes/123',
						html_url: 'https://github.com/user/my-repo/issues/1',
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

		it('should handle issue creation errors', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: '123',
				config: JSON.stringify({
					repositoryId: '123',
					repositoryFullName: 'user/my-repo',
					includeNoteContent: true,
				}),
				integration: {
					id: 'integration-123',
					accessToken: null,
					organizationId: 'org-123',
					providerName: 'github',
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
			).rejects.toThrow('No access token available for GitHub integration')
		})
	})

	describe('validateConnection', () => {
		it('should validate connection successfully', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: '123',
				config: JSON.stringify({
					repositoryId: '123',
					repositoryFullName: 'user/my-repo',
				}),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'github',
					isActive: true,
				},
			} as any

			// Override MSW handler for repository validation
			server.use(
				http.get('https://api.github.com/repos/user/my-repo', () => {
					return HttpResponse.json({
						id: 123,
						name: 'my-repo',
						full_name: 'user/my-repo',
						has_issues: true,
						permissions: {
							admin: true,
							push: true,
							pull: true,
						},
					})
				}),
			)

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(true)
		})

		it('should return false for invalid connection', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: '123',
				config: JSON.stringify({
					repositoryId: '123',
					repositoryFullName: 'user/invalid-repo',
				}),
				integration: {
					id: 'integration-123',
					accessToken: null,
					organizationId: 'org-123',
					providerName: 'github',
					isActive: true,
				},
			} as any

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(false)
		})

		it('should handle validation errors', async () => {
			const mockConnection = {
				id: 'connection-123',
				externalId: '123',
				config: JSON.stringify({
					repositoryId: '123',
					repositoryFullName: 'user/my-repo',
				}),
				integration: {
					id: 'integration-123',
					accessToken: 'encrypted-access-token',
					organizationId: 'org-123',
					providerName: 'github',
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
			await expect(provider.refreshToken!('old-refresh-token')).rejects.toThrow(
				'GitHub does not support token refresh. Please re-authenticate.',
			)
		})

		it('should handle refresh token errors', async () => {
			await expect(
				provider.refreshToken!('invalid-refresh-token'),
			).rejects.toThrow(
				'GitHub does not support token refresh. Please re-authenticate.',
			)
		})
	})

	describe('Error Handling', () => {
		it('should handle missing environment variables', async () => {
			delete process.env.GITHUB_INTEGRATION_CLIENT_ID

			await expect(
				provider.getAuthUrl('org-123', 'http://localhost:3000/callback'),
			).rejects.toThrow(
				'GITHUB_INTEGRATION_CLIENT_ID environment variable is required',
			)
		})
	})
})
