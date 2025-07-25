/**
 * Tests for providers index
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	initializeProviders,
	getAvailableProviders,
} from '../../src/providers/index'
import { providerRegistry } from '../../src/provider'

// Mock all provider classes
vi.mock('../../src/providers/slack/provider', () => ({
	SlackProvider: vi.fn().mockImplementation(() => ({
		name: 'slack',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/jira/provider', () => ({
	JiraProvider: vi.fn().mockImplementation(() => ({
		name: 'jira',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/linear/provider', () => ({
	LinearProvider: vi.fn().mockImplementation(() => ({
		name: 'linear',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/gitlab/provider', () => ({
	GitLabProvider: vi.fn().mockImplementation(() => ({
		name: 'gitlab',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/clickup/provider', () => ({
	ClickUpProvider: vi.fn().mockImplementation(() => ({
		name: 'clickup',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/notion/provider', () => ({
	NotionProvider: vi.fn().mockImplementation(() => ({
		name: 'notion',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/asana/provider', () => ({
	AsanaProvider: vi.fn().mockImplementation(() => ({
		name: 'asana',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/trello/provider', () => ({
	TrelloProvider: vi.fn().mockImplementation(() => ({
		name: 'trello',
		type: 'productivity',
	})),
}))

vi.mock('../../src/providers/github/provider', () => ({
	GitHubProvider: vi.fn().mockImplementation(() => ({
		name: 'github',
		type: 'productivity',
	})),
}))

vi.mock('../../src/provider', () => ({
	providerRegistry: {
		register: vi.fn(),
	},
}))

describe('Providers Index', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('initializeProviders', () => {
		it('should register all providers', () => {
			initializeProviders()

			// Verify that register was called for each provider
			expect(providerRegistry.register).toHaveBeenCalledTimes(9)

			// Verify each provider was registered
			const registerCalls = vi.mocked(providerRegistry.register).mock.calls
			const providerNames = registerCalls.map((call) => call[0].name)

			expect(providerNames).toContain('slack')
			expect(providerNames).toContain('jira')
			expect(providerNames).toContain('linear')
			expect(providerNames).toContain('gitlab')
			expect(providerNames).toContain('clickup')
			expect(providerNames).toContain('notion')
			expect(providerNames).toContain('asana')
			expect(providerNames).toContain('trello')
			expect(providerNames).toContain('github')
		})
	})

	describe('getAvailableProviders', () => {
		it('should return all available providers with correct structure', () => {
			const providers = getAvailableProviders()

			expect(providers).toHaveLength(9)

			// Check that each provider has the required fields
			providers.forEach((provider) => {
				expect(provider).toHaveProperty('name')
				expect(provider).toHaveProperty('type')
				expect(provider).toHaveProperty('displayName')
				expect(provider).toHaveProperty('description')
				expect(provider).toHaveProperty('icon')
				expect(typeof provider.name).toBe('string')
				expect(typeof provider.type).toBe('string')
				expect(typeof provider.displayName).toBe('string')
				expect(typeof provider.description).toBe('string')
				expect(typeof provider.icon).toBe('string')
			})
		})

		it('should include Slack provider with correct details', () => {
			const providers = getAvailableProviders()
			const slackProvider = providers.find((p) => p.name === 'slack')

			expect(slackProvider).toBeDefined()
			expect(slackProvider?.type).toBe('productivity')
			expect(slackProvider?.displayName).toBe('Slack')
			expect(slackProvider?.description).toBe(
				'Connect notes to Slack channels for team collaboration',
			)
			expect(slackProvider?.icon).toBe('link-2')
		})

		it('should include Jira provider with correct details', () => {
			const providers = getAvailableProviders()
			const jiraProvider = providers.find((p) => p.name === 'jira')

			expect(jiraProvider).toBeDefined()
			expect(jiraProvider?.type).toBe('productivity')
			expect(jiraProvider?.displayName).toBe('Jira')
			expect(jiraProvider?.description).toBe(
				'Connect notes to Jira projects for issue tracking and project management',
			)
			expect(jiraProvider?.icon).toBe('link-2')
		})

		it('should include Linear provider with correct details', () => {
			const providers = getAvailableProviders()
			const linearProvider = providers.find((p) => p.name === 'linear')

			expect(linearProvider).toBeDefined()
			expect(linearProvider?.type).toBe('productivity')
			expect(linearProvider?.displayName).toBe('Linear')
			expect(linearProvider?.description).toBe(
				'Connect notes to Linear teams and projects for issue tracking and project management',
			)
			expect(linearProvider?.icon).toBe('link-2')
		})

		it('should include GitLab provider with correct details', () => {
			const providers = getAvailableProviders()
			const gitlabProvider = providers.find((p) => p.name === 'gitlab')

			expect(gitlabProvider).toBeDefined()
			expect(gitlabProvider?.type).toBe('productivity')
			expect(gitlabProvider?.displayName).toBe('GitLab')
			expect(gitlabProvider?.description).toBe(
				'Connect notes to GitLab projects for issue tracking and project management',
			)
			expect(gitlabProvider?.icon).toBe('link-2')
		})

		it('should include ClickUp provider with correct details', () => {
			const providers = getAvailableProviders()
			const clickupProvider = providers.find((p) => p.name === 'clickup')

			expect(clickupProvider).toBeDefined()
			expect(clickupProvider?.type).toBe('productivity')
			expect(clickupProvider?.displayName).toBe('ClickUp')
			expect(clickupProvider?.description).toBe(
				'Connect notes to ClickUp spaces and lists for task management',
			)
			expect(clickupProvider?.icon).toBe('link-2')
		})

		it('should include Notion provider with correct details', () => {
			const providers = getAvailableProviders()
			const notionProvider = providers.find((p) => p.name === 'notion')

			expect(notionProvider).toBeDefined()
			expect(notionProvider?.type).toBe('productivity')
			expect(notionProvider?.displayName).toBe('Notion')
			expect(notionProvider?.description).toBe(
				'Connect notes to Notion databases for knowledge management and collaboration',
			)
			expect(notionProvider?.icon).toBe('link-2')
		})

		it('should include Asana provider with correct details', () => {
			const providers = getAvailableProviders()
			const asanaProvider = providers.find((p) => p.name === 'asana')

			expect(asanaProvider).toBeDefined()
			expect(asanaProvider?.type).toBe('productivity')
			expect(asanaProvider?.displayName).toBe('Asana')
			expect(asanaProvider?.description).toBe(
				'Connect notes to Asana projects for task management and team collaboration',
			)
			expect(asanaProvider?.icon).toBe('link-2')
		})

		it('should include Trello provider with correct details', () => {
			const providers = getAvailableProviders()
			const trelloProvider = providers.find((p) => p.name === 'trello')

			expect(trelloProvider).toBeDefined()
			expect(trelloProvider?.type).toBe('productivity')
			expect(trelloProvider?.displayName).toBe('Trello')
			expect(trelloProvider?.description).toBe(
				'Connect notes to Trello boards for task management and project organization',
			)
			expect(trelloProvider?.icon).toBe('link-2')
		})

		it('should include GitHub provider with correct details', () => {
			const providers = getAvailableProviders()
			const githubProvider = providers.find((p) => p.name === 'github')

			expect(githubProvider).toBeDefined()
			expect(githubProvider?.type).toBe('productivity')
			expect(githubProvider?.displayName).toBe('GitHub')
			expect(githubProvider?.description).toBe(
				'Connect notes to GitHub repositories for issue tracking and project management',
			)
			expect(githubProvider?.icon).toBe('link-2')
		})

		it('should return providers in consistent order', () => {
			const providers1 = getAvailableProviders()
			const providers2 = getAvailableProviders()

			expect(providers1.map((p) => p.name)).toEqual(
				providers2.map((p) => p.name),
			)
		})

		it('should return all providers with productivity type', () => {
			const providers = getAvailableProviders()

			providers.forEach((provider) => {
				expect(provider.type).toBe('productivity')
			})
		})

		it('should return all providers with link-2 icon', () => {
			const providers = getAvailableProviders()

			providers.forEach((provider) => {
				expect(provider.icon).toBe('link-2')
			})
		})
	})

	describe('Provider Names', () => {
		it('should have unique provider names', () => {
			const providers = getAvailableProviders()
			const names = providers.map((p) => p.name)
			const uniqueNames = [...new Set(names)]

			expect(names).toHaveLength(uniqueNames.length)
		})

		it('should have unique display names', () => {
			const providers = getAvailableProviders()
			const displayNames = providers.map((p) => p.displayName)
			const uniqueDisplayNames = [...new Set(displayNames)]

			expect(displayNames).toHaveLength(uniqueDisplayNames.length)
		})
	})

	describe('Provider Descriptions', () => {
		it('should have meaningful descriptions', () => {
			const providers = getAvailableProviders()

			providers.forEach((provider) => {
				expect(provider.description.length).toBeGreaterThan(20)
				expect(provider.description).toContain('Connect notes')
				expect(provider.description).toContain(provider.displayName)
			})
		})

		it('should have descriptions that mention the provider purpose', () => {
			const providers = getAvailableProviders()
			const purposeKeywords = [
				'collaboration',
				'tracking',
				'management',
				'task',
				'project',
				'issue',
				'knowledge',
				'organization',
			]

			providers.forEach((provider) => {
				const hasRelevantKeyword = purposeKeywords.some((keyword) =>
					provider.description.toLowerCase().includes(keyword),
				)
				expect(hasRelevantKeyword).toBe(true)
			})
		})
	})
})
