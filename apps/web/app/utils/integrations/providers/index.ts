/**
 * Integration providers registry and initialization
 */

import { providerRegistry } from '../provider'
import { SlackProvider } from './slack-provider'

/**
 * Initialize and register all available integration providers
 */
export function initializeProviders(): void {
  // Register Slack provider
  providerRegistry.register(new SlackProvider())
  
  // Future providers can be registered here
  // providerRegistry.register(new TeamsProvider())
  // providerRegistry.register(new JiraProvider())
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
    }
  ]
}

// Initialize providers when module is loaded
initializeProviders()

// Re-export providers for convenience
export { SlackProvider }
export { providerRegistry } from '../provider'