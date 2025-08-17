/**
 * Test to verify MSW mocks are working correctly
 */

import { describe, it, expect } from 'vitest'

describe('MSW Mocks', () => {
	it('should mock Slack OAuth response', async () => {
		const response = await fetch('https://slack.com/api/oauth.v2.access', {
			method: 'POST',
			body: JSON.stringify({ code: 'test-code' }),
		})

		const data = await response.json()

		expect(response.ok).toBe(true)
		expect(data.ok).toBe(true)
		expect(data.access_token).toBe('xoxb-test-slack-token')
		expect(data.team.name).toBe('Test Team')
	})

	it('should mock Jira OAuth response', async () => {
		const response = await fetch('https://auth.atlassian.com/oauth/token', {
			method: 'POST',
			body: JSON.stringify({ code: 'test-code' }),
		})

		const data = await response.json()

		expect(response.ok).toBe(true)
		expect(data.access_token).toBe('test-jira-access-token')
		expect(data.refresh_token).toBe('test-jira-refresh-token')
		expect(data.expires_in).toBe(3600)
	})

	it('should mock Slack channels response', async () => {
		const response = await fetch('https://slack.com/api/conversations.list')

		const data = await response.json()

		expect(response.ok).toBe(true)
		expect(data.ok).toBe(true)
		expect(data.channels).toHaveLength(2)
		expect(data.channels[0].name).toBe('general')
		expect(data.channels[1].name).toBe('random')
	})

	it('should mock Jira projects response', async () => {
		const response = await fetch(
			'https://api.atlassian.com/ex/jira/test-cloud-id/rest/api/3/project/search',
		)

		const data = await response.json()

		expect(response.ok).toBe(true)
		expect(data.values).toHaveLength(2)
		expect(data.values[0].key).toBe('TEST')
		expect(data.values[0].name).toBe('Test Project')
		expect(data.values[1].key).toBe('DEMO')
	})
})
