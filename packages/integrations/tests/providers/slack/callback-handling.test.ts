import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackProvider } from '../../../src/providers/slack/provider'
import { server } from '../../setup'
import { http, HttpResponse } from 'msw'
import { fixtures } from '../../utils/fixtures'

describe('SlackProvider - Callback Handling', () => {
	let provider: SlackProvider

	beforeEach(() => {
		provider = new SlackProvider()
		// Reset environment variables
		delete process.env.SLACK_CLIENT_ID
		delete process.env.SLACK_CLIENT_SECRET
	})

	describe('handleCallback', () => {
		it('should return mock token data when using demo credentials', async () => {
			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state,
			}

			const tokenData = await provider.handleCallback(params)

			expect(tokenData.accessToken).toMatch(/^mock-slack-token-\d+$/)
			expect(tokenData.scope).toBe(
				'channels:read,chat:write,channels:history,groups:read',
			)
			expect(tokenData.metadata).toEqual({
				teamId: 'T1234567890',
				teamName: 'Demo Team',
				botUserId: 'U1234567890',
			})
		})

		it('should exchange code for real token when using real credentials', async () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			// Override the handler to ensure we get the correct response
			server.use(
				http.post('https://slack.com/api/oauth.v2.access', () => {
					return HttpResponse.json(fixtures.slack.oauthResponse)
				}),
			)

			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state,
			}

			const tokenData = await provider.handleCallback(params)

			expect(tokenData.accessToken).toBe('xoxb-test-slack-token')
			expect(tokenData.scope).toBe('channels:read,chat:write')
			expect(tokenData.metadata).toEqual({
				teamId: 'T1234567890',
				teamName: 'Test Team',
				botUserId: 'U1234567890',
			})
		})

		it('should handle OAuth API errors', async () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			// Mock error response
			server.use(
				http.post('https://slack.com/api/oauth.v2.access', () => {
					return HttpResponse.json(fixtures.slack.oauthErrorResponse)
				}),
			)

			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'error-code',
				state,
			}

			await expect(provider.handleCallback(params)).rejects.toThrow(
				'Slack OAuth error: invalid_code',
			)
		})

		it('should handle network errors during token exchange', async () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			// Mock network error
			server.use(
				http.post('https://slack.com/api/oauth.v2.access', () => {
					return HttpResponse.error()
				}),
			)

			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state,
			}

			await expect(provider.handleCallback(params)).rejects.toThrow(
				'Failed to exchange OAuth code',
			)
		})

		it('should handle HTTP error responses', async () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			// Mock HTTP error
			server.use(
				http.post('https://slack.com/api/oauth.v2.access', () => {
					return HttpResponse.json({ error: 'server_error' }, { status: 500 })
				}),
			)

			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state,
			}

			await expect(provider.handleCallback(params)).rejects.toThrow(
				'Slack OAuth API error: 500',
			)
		})

		it('should handle missing access token in response', async () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			// Mock response without access token
			server.use(
				http.post('https://slack.com/api/oauth.v2.access', () => {
					return HttpResponse.json({
						ok: true,
						// Missing access_token
						scope: 'channels:read,chat:write',
					})
				}),
			)

			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state,
			}

			await expect(provider.handleCallback(params)).rejects.toThrow(
				'Slack OAuth error: Unknown error',
			)
		})

		it('should handle invalid state parameter', async () => {
			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state: 'invalid-base64-state',
			}

			// The current implementation properly validates state and should throw an error
			await expect(provider.handleCallback(params)).rejects.toThrow(
				'Invalid OAuth state'
			)
		})

		it('should make correct API request with real credentials', async () => {
			process.env.SLACK_CLIENT_ID = 'real-client-id'
			process.env.SLACK_CLIENT_SECRET = 'real-client-secret'

			let requestBody: string = ''
			server.use(
				http.post(
					'https://slack.com/api/oauth.v2.access',
					async ({ request }) => {
						requestBody = await request.text()
						return HttpResponse.json(fixtures.slack.oauthResponse)
					},
				),
			)

			// Generate proper state using OAuthStateManager
			const { OAuthStateManager } = await import('../../../src/oauth-manager')
			const state = OAuthStateManager.generateState('org-123', 'slack')

			const params = {
				organizationId: 'org-123',
				code: 'test-auth-code',
				state,
			}

			await provider.handleCallback(params)

			const parsedBody = new URLSearchParams(requestBody)
			expect(parsedBody.get('client_id')).toBe('real-client-id')
			expect(parsedBody.get('client_secret')).toBe('real-client-secret')
			expect(parsedBody.get('code')).toBe('test-auth-code')
		})
	})

	describe('refreshToken', () => {
		it('should throw error as Slack does not support token refresh', async () => {
			await expect(provider.refreshToken('refresh-token')).rejects.toThrow(
				'Slack bot tokens do not require refresh',
			)
		})
	})
})
