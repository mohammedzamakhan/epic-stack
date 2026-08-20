import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockDb } from '../utils/mock-database'

vi.mock('@repo/database', () => {
	const table = new Proxy({}, { get: (_, property) => property })
	return {
		db: mockDb,
		Integration: table,
		IntegrationLog: table,
		NoteIntegrationConnection: table,
		Organization: table,
		OrganizationNote: table,
		and: vi.fn(),
		count: vi.fn(),
		desc: vi.fn(),
		eq: vi.fn(),
		gte: vi.fn(),
	}
})

vi.mock('../../src/oauth-manager', () => ({
	OAuthStateManager: {
		generateState: vi.fn().mockReturnValue('state-1'),
		validateState: vi.fn().mockReturnValue({
			organizationId: 'org-1',
			providerName: 'slack',
			timestamp: Date.now(),
		}),
	},
}))

import { oauthFlow } from '../../src/oauth-flow'
import { integrationManager } from '../../src/integration-manager'

describe('OAuth flow', () => {
	beforeEach(() => {
		process.env.SLACK_CLIENT_ID = 'test-client'
		process.env.SLACK_CLIENT_SECRET = 'test-secret'
	})

	it('delegates OAuth start to the registered provider', async () => {
		const provider = {
			name: 'oauth-test',
			type: 'productivity' as const,
			getAuthUrl: vi
				.fn()
				.mockResolvedValue('https://example.test/authorize?state=state-1'),
		} as any
		integrationManager.registerProvider(provider)

		await expect(
			oauthFlow.start('org-1', 'oauth-test', 'https://example.test/callback'),
		).resolves.toEqual({
			authUrl: 'https://example.test/authorize?state=state-1',
			state: 'state-1',
		})
		expect(provider.getAuthUrl).toHaveBeenCalled()
	})

	it('rejects a callback whose state belongs to another provider', async () => {
		const provider = {
			name: 'jira',
			type: 'productivity' as const,
		} as any
		integrationManager.registerProvider(provider)

		await expect(
			oauthFlow.complete('jira', {
				organizationId: 'org-1',
				code: 'code',
				state: 'state-1',
			}),
		).rejects.toThrow('Provider name mismatch in OAuth state')
	})
})
