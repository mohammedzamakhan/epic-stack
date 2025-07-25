/**
 * Integration providers registry and initialization
 */

import { providerRegistry } from '../provider'
import { SlackProvider } from './slack/provider'
import { JiraProvider } from './jira/provider'
import { LinearProvider } from './linear/provider'
import { GitLabProvider } from './gitlab/provider'
import { ClickUpProvider } from './clickup/provider'
import { NotionProvider } from './notion/provider'
import { AsanaProvider } from './asana/provider'
import { TrelloProvider } from './trello/provider'
import { GitHubProvider } from './github/provider'

/**
 * Initialize and register all available integration providers
 */
export function initializeProviders(): void {
	// Register Slack provider
	providerRegistry.register(new SlackProvider())

	// Register Jira provider
	providerRegistry.register(new JiraProvider())

	// Register Linear provider
	providerRegistry.register(new LinearProvider())

	// Register GitLab provider
	providerRegistry.register(new GitLabProvider())

	// Register ClickUp provider
	providerRegistry.register(new ClickUpProvider())

	// Register Notion provider
	providerRegistry.register(new NotionProvider())

	// Register Asana provider
	providerRegistry.register(new AsanaProvider())

	// Register Trello provider
	providerRegistry.register(new TrelloProvider())

	// Register GitHub provider
	providerRegistry.register(new GitHubProvider())

	// Future providers can be registered here
	// providerRegistry.register(new TeamsProvider())
}

/**
 * Get all available providers for display in UI
 */
export function getAvailableProviders() {
	return [
		{
			name: 'slack',
			type: 'productivity',
			displayName: 'Slack',
			description: 'Connect notes to Slack channels for team collaboration',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'jira',
			type: 'productivity',
			displayName: 'Jira',
			description:
				'Connect notes to Jira projects for issue tracking and project management',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'linear',
			type: 'productivity',
			displayName: 'Linear',
			description:
				'Connect notes to Linear teams and projects for issue tracking and project management',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'gitlab',
			type: 'productivity',
			displayName: 'GitLab',
			description:
				'Connect notes to GitLab projects for issue tracking and project management',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'clickup',
			type: 'productivity',
			displayName: 'ClickUp',
			description:
				'Connect notes to ClickUp spaces and lists for task management',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'notion',
			type: 'productivity',
			displayName: 'Notion',
			description:
				'Connect notes to Notion databases for knowledge management and collaboration',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'asana',
			type: 'productivity',
			displayName: 'Asana',
			description:
				'Connect notes to Asana projects for task management and team collaboration',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'trello',
			type: 'productivity',
			displayName: 'Trello',
			description:
				'Connect notes to Trello boards for task management and project organization',
			icon: 'link-2', // Using generic icon for now
		},
		{
			name: 'github',
			type: 'productivity',
			displayName: 'GitHub',
			description:
				'Connect notes to GitHub repositories for issue tracking and project management',
			icon: 'link-2', // Using generic icon for now
		},
	]
}

// Initialize providers when module is loaded
initializeProviders()

// Re-export providers for convenience
export { SlackProvider }
export { JiraProvider }
export { LinearProvider }
export { GitLabProvider }
export { ClickUpProvider }
export { NotionProvider }
export { AsanaProvider }
export { TrelloProvider }
export { GitHubProvider }
export { providerRegistry } from '../provider'
