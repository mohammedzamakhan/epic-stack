import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JiraProvider } from '../../../src/providers/jira/provider'
import { fixtures } from '../../utils/fixtures'

describe('JiraProvider - Token Refresh', () => {
	let provider: JiraProvider

	beforeEach(() => {
		provider = new JiraProvider()
		process.env.JIRA_CLIENT_ID = 'test-client-id'
		process.env.JIRA_CLIENT_SECRET = 'test-client-secret'

		// Reset fetch mock
		global.fetch = vi.fn()
	})

	describe('refreshToken', () => {
		it('should successfully refresh access token', async () => {
			const refreshToken = 'test-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 7200,
					scope: 'read:jira-work write:jira-work',
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const tokenData = await provider.refreshToken(refreshToken)

			expect(tokenData).toEqual({
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiresAt: expect.any(Date),
				scope: 'read:jira-work write:jira-work',
			})

			// Verify refresh request
			expect(fetch).toHaveBeenCalledWith(
				'https://auth.atlassian.com/oauth/token',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						grant_type: 'refresh_token',
						client_id: 'test-client-id',
						client_secret: 'test-client-secret',
						refresh_token: refreshToken,
					}),
				},
			)
		})

		it('should throw error when refresh token is missing', async () => {
			await expect(provider.refreshToken('')).rejects.toThrow(
				'Refresh token is required',
			)

			await expect(provider.refreshToken(null as any)).rejects.toThrow(
				'Refresh token is required',
			)

			await expect(provider.refreshToken(undefined as any)).rejects.toThrow(
				'Refresh token is required',
			)
		})

		it('should handle refresh API failure', async () => {
			const refreshToken = 'test-refresh-token'

			const mockErrorResponse = {
				ok: false,
				text: vi.fn().mockResolvedValue('Invalid refresh token'),
			}

			global.fetch = vi.fn().mockResolvedValue(mockErrorResponse)

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Token refresh failed: Invalid refresh token',
			)
		})

		it('should handle refresh response with error', async () => {
			const refreshToken = 'test-refresh-token'

			const mockErrorResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					error: 'invalid_grant',
					error_description: 'Refresh token has expired',
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockErrorResponse)

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Token refresh error: Refresh token has expired',
			)
		})

		it('should handle refresh response with error but no description', async () => {
			const refreshToken = 'test-refresh-token'

			const mockErrorResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					error: 'invalid_grant',
					// No error_description
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockErrorResponse)

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Token refresh error: invalid_grant',
			)
		})

		it('should calculate correct expiration time', async () => {
			const refreshToken = 'test-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 3600, // 1 hour
					scope: 'read:jira-work write:jira-work',
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const beforeTime = Date.now()
			const tokenData = await provider.refreshToken(refreshToken)
			const afterTime = Date.now()

			expect(tokenData.expiresAt).toBeInstanceOf(Date)
			const expiresAtTime = tokenData.expiresAt!.getTime()

			// Should be approximately 1 hour from now (3600 seconds)
			expect(expiresAtTime).toBeGreaterThan(beforeTime + 3590000) // 3590 seconds
			expect(expiresAtTime).toBeLessThan(afterTime + 3610000) // 3610 seconds
		})

		it('should handle response without expires_in', async () => {
			const refreshToken = 'test-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					scope: 'read:jira-work write:jira-work',
					// No expires_in
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const tokenData = await provider.refreshToken(refreshToken)

			expect(tokenData.expiresAt).toBeUndefined()
		})

		it('should reuse original refresh token when new one is not provided', async () => {
			const refreshToken = 'original-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					// No new refresh_token provided
					expires_in: 3600,
					scope: 'read:jira-work write:jira-work',
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const tokenData = await provider.refreshToken(refreshToken)

			expect(tokenData.refreshToken).toBe('original-refresh-token')
		})

		it('should use new refresh token when provided', async () => {
			const refreshToken = 'original-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 3600,
					scope: 'read:jira-work write:jira-work',
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const tokenData = await provider.refreshToken(refreshToken)

			expect(tokenData.refreshToken).toBe('new-refresh-token')
		})

		it('should handle network errors during refresh', async () => {
			const refreshToken = 'test-refresh-token'

			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Failed to refresh Jira token: Network error',
			)
		})

		it('should handle unexpected errors during refresh', async () => {
			const refreshToken = 'test-refresh-token'

			global.fetch = vi.fn().mockRejectedValue('Unexpected error')

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Failed to refresh Jira token: Unknown error',
			)
		})

		it('should use correct client credentials from environment', async () => {
			process.env.JIRA_CLIENT_ID = 'custom-client-id'
			process.env.JIRA_CLIENT_SECRET = 'custom-client-secret'

			const refreshToken = 'test-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue(fixtures.jira.oauthResponse),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			await provider.refreshToken(refreshToken)

			expect(fetch).toHaveBeenCalledWith(
				'https://auth.atlassian.com/oauth/token',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
					body: JSON.stringify({
						grant_type: 'refresh_token',
						client_id: 'custom-client-id',
						client_secret: 'custom-client-secret',
						refresh_token: refreshToken,
					}),
				},
			)
		})

		it('should handle JSON parsing errors', async () => {
			const refreshToken = 'test-refresh-token'

			const mockInvalidJsonResponse = {
				ok: true,
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockInvalidJsonResponse)

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Failed to refresh Jira token: Invalid JSON',
			)
		})

		it('should handle rate limiting during refresh', async () => {
			const refreshToken = 'test-refresh-token'

			const mockRateLimitResponse = {
				ok: false,
				status: 429,
				text: vi.fn().mockResolvedValue('Rate limit exceeded'),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRateLimitResponse)

			await expect(provider.refreshToken(refreshToken)).rejects.toThrow(
				'Token refresh failed: Rate limit exceeded',
			)
		})

		it('should preserve scope from refresh response', async () => {
			const refreshToken = 'test-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 3600,
					scope: 'read:jira-work write:jira-work manage:jira-project',
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const tokenData = await provider.refreshToken(refreshToken)

			expect(tokenData.scope).toBe(
				'read:jira-work write:jira-work manage:jira-project',
			)
		})

		it('should handle missing scope in refresh response', async () => {
			const refreshToken = 'test-refresh-token'

			const mockRefreshResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					access_token: 'new-access-token',
					refresh_token: 'new-refresh-token',
					expires_in: 3600,
					// No scope
				}),
				text: vi.fn().mockResolvedValue(''),
			}

			global.fetch = vi.fn().mockResolvedValue(mockRefreshResponse)

			const tokenData = await provider.refreshToken(refreshToken)

			expect(tokenData.scope).toBeUndefined()
		})
	})
})
