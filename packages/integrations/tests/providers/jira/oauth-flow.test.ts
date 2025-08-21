import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JiraProvider } from '../../../src/providers/jira/provider'

describe('JiraProvider - OAuth Flow', () => {
	let provider: JiraProvider

	beforeEach(() => {
		provider = new JiraProvider()
		// Set default environment variables
		process.env.JIRA_CLIENT_ID = 'test-client-id'
		process.env.JIRA_CLIENT_SECRET = 'test-client-secret'
	})

	describe('getAuthUrl', () => {
		it('should generate correct authorization URL with required parameters', async () => {
			const organizationId = 'org-123'
			const redirectUri = 'https://example.com/callback'

			const authUrl = await provider.getAuthUrl(organizationId, redirectUri)

			expect(authUrl).toContain('https://auth.atlassian.com/authorize')
			expect(authUrl).toContain('audience=api.atlassian.com')
			expect(authUrl).toContain('client_id=')
			// Check that the scope contains the expected values (URL encoding may vary)
			expect(authUrl).toMatch(
				/scope=.*read.*jira-work.*write.*jira-work.*manage.*jira-project.*read.*me.*offline_access/,
			)
			expect(authUrl).toContain(
				`redirect_uri=${encodeURIComponent(redirectUri)}`,
			)
			expect(authUrl).toContain('response_type=code')
			expect(authUrl).toContain('prompt=consent')
			expect(authUrl).toContain('state=')
		})

		it('should include organization ID and provider name in state', async () => {
			const organizationId = 'org-123'
			const redirectUri = 'https://example.com/callback'

			const authUrl = await provider.getAuthUrl(organizationId, redirectUri)

			// Extract state parameter
			const urlParams = new URLSearchParams(authUrl.split('?')[1])
			const state = urlParams.get('state')
			expect(state).toBeTruthy()

			// Decode and parse state (extract payload part before signature)
			const statePayload = state!.split('.')[0]
			const decodedState = JSON.parse(
				Buffer.from(statePayload, 'base64').toString(),
			)
			expect(decodedState.organizationId).toBe(organizationId)
			expect(decodedState.providerName).toBe('jira')
			expect(decodedState.redirectUri).toBe(redirectUri) // Additional data includes redirectUri
			expect(decodedState.timestamp).toBeTypeOf('number')
			expect(decodedState.nonce).toBeTypeOf('string')
		})

		it('should use demo client ID when JIRA_CLIENT_ID is not set', async () => {
			// Ensure environment variable is not set
			delete process.env.JIRA_CLIENT_ID

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)

			expect(authUrl).toContain('client_id=demo-jira-client-id')
			expect(authUrl).toContain('https://auth.atlassian.com/authorize')
		})

		it('should use environment variables when available', async () => {
			process.env.JIRA_CLIENT_ID = 'real-client-id'
			process.env.JIRA_CLIENT_SECRET = 'real-client-secret'

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)

			expect(authUrl).toContain('client_id=real-client-id')
		})

		it('should include correct scopes for Jira integration', async () => {
			process.env.JIRA_CLIENT_ID = 'test-client-id'

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)

			const urlParams = new URLSearchParams(authUrl.split('?')[1])
			const scope = urlParams.get('scope')

			expect(scope).toBe(
				'read:jira-work write:jira-work manage:jira-project read:me offline_access',
			)
		})

		it('should generate unique state for each request', async () => {
			process.env.JIRA_CLIENT_ID = 'test-client-id'

			const authUrl1 = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)
			const authUrl2 = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)

			const state1 = new URLSearchParams(authUrl1.split('?')[1]).get('state')
			const state2 = new URLSearchParams(authUrl2.split('?')[1]).get('state')

			expect(state1).not.toBe(state2)
		})

		it('should handle additional parameters if provided', async () => {
			process.env.JIRA_CLIENT_ID = 'test-client-id'

			const additionalParams = { instanceUrl: 'https://test.atlassian.net' }

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
				additionalParams,
			)

			// Extract state parameter and verify additional params are included
			const urlParams = new URLSearchParams(authUrl.split('?')[1])
			const state = urlParams.get('state')
			const statePayload = state!.split('.')[0]
			const decodedState = JSON.parse(
				Buffer.from(statePayload, 'base64').toString(),
			)

			expect(decodedState.instanceUrl).toBe('https://test.atlassian.net')
			expect(authUrl).toContain('https://auth.atlassian.com/authorize')
		})

		it('should include audience parameter for Atlassian API', async () => {
			process.env.JIRA_CLIENT_ID = 'test-client-id'

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)

			const urlParams = new URLSearchParams(authUrl.split('?')[1])
			const audience = urlParams.get('audience')

			expect(audience).toBe('api.atlassian.com')
		})

		it('should include prompt=consent for proper authorization', async () => {
			process.env.JIRA_CLIENT_ID = 'test-client-id'

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)

			const urlParams = new URLSearchParams(authUrl.split('?')[1])
			const prompt = urlParams.get('prompt')

			expect(prompt).toBe('consent')
		})
	})
})
