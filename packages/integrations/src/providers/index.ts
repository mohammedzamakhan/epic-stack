/**
 * Integration providers registry and initialization
 */

import { providerRegistry } from '../provider'
import { SlackProvider } from './slack/provider'
import { JiraProvider } from './jira/provider'
import { LinearProvider } from './linear/provider'
import { GitLabProvider } from './gitlab/provider'

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
      icon: 'link-2' // Using generic icon for now
    },
    {
      name: 'jira',
      type: 'productivity',
      displayName: 'Jira',
      description: 'Connect notes to Jira projects for issue tracking and project management',
      icon: 'link-2' // Using generic icon for now
    },
    {
      name: 'linear',
      type: 'productivity',
      displayName: 'Linear',
      description: 'Connect notes to Linear teams and projects for issue tracking and project management',
      icon: 'link-2' // Using generic icon for now
    },
    {
      name: 'gitlab',
      type: 'productivity',
      displayName: 'GitLab',
      description: 'Connect notes to GitLab projects for issue tracking and project management',
      icon: 'link-2' // Using generic icon for now
    }
  ]
}

// Initialize providers when module is loaded
initializeProviders()

// Re-export providers for convenience
export { SlackProvider }
export { JiraProvider }
export { LinearProvider }
export { providerRegistry } from '../provider'