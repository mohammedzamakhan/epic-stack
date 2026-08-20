import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryChain, mockDb, resetMockDb } from '../utils/mock-database'

vi.mock('@repo/database', () => {
	const table = new Proxy({}, { get: (_, property) => property })
	return {
		db: mockDb,
		Integration: table,
		IntegrationLog: table,
		NoteIntegrationConnection: table,
		Organization: table,
		OrganizationNote: table,
		User: table,
		and: vi.fn(),
		eq: vi.fn(),
		desc: vi.fn(),
		gte: vi.fn(),
		count: vi.fn(),
	}
})

import { integrationManager } from '../../src/integration-manager'
import { noteNotifier } from '../../src/note-notifier'

describe('Provider interactions', () => {
	beforeEach(async () => {
		resetMockDb()
		process.env.SLACK_CLIENT_ID = 'test-client'
		process.env.SLACK_CLIENT_SECRET = 'test-secret'
		const { SlackProvider } = await import('../../src/providers/slack/provider')
		integrationManager.registerProvider(new SlackProvider())
	})

	it('retrieves demo Slack channels through a selected integration', async () => {
		const integration = {
			id: 'slack-1',
			organizationId: 'org-1',
			providerName: 'slack',
			providerType: 'communication',
			accessToken: 'mock-slack-token-1',
			refreshToken: null,
			tokenExpiresAt: null,
			config: '{}',
			isActive: true,
			lastSyncAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		mockDb.select
			.mockImplementationOnce(() => queryChain([integration]))
			.mockImplementationOnce(() => queryChain([]))
			.mockImplementationOnce(() => queryChain([]))

		const channels = await integrationManager.getAvailableChannels('slack-1')

		expect(channels.length).toBeGreaterThan(0)
		expect(channels[0]?.name).toBe('general')
		expect(mockDb.insert).toHaveBeenCalled()
	})

	it('does not load a note or author when no connections exist', async () => {
		mockDb.select.mockImplementationOnce(() => queryChain([]))

		await expect(
			noteNotifier.notify('note-1', 'created', 'user-1'),
		).resolves.toEqual({
			success: true,
			connectionsNotified: 0,
			errors: [],
		})
		expect(mockDb.select).toHaveBeenCalledOnce()
	})
})
