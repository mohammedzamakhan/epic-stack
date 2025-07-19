/**
 * Integration system setup and provider registration
 * 
 * This file demonstrates how to register providers and set up the integration system.
 * It should be called during application initialization.
 */

import { providerRegistry } from './provider'
import { SlackProvider } from './providers/slack'

/**
 * Initialize the integration system by registering all available providers
 */
export function initializeIntegrations(): void {
  // Register Slack provider
  const slackProvider = new SlackProvider()
  providerRegistry.register(slackProvider)
  
  // Future providers would be registered here:
  // const teamsProvider = new TeamsProvider()
  // providerRegistry.register(teamsProvider)
  
  // const jiraProvider = new JiraProvider()
  // providerRegistry.register(jiraProvider)
  
  console.log(`Registered ${providerRegistry.getAll().length} integration providers`)
}

/**
 * Get available providers for display in UI
 */
export function getAvailableProviders() {
  return providerRegistry.getAll().map(provider => ({
    name: provider.name,
    displayName: provider.displayName,
    description: provider.description,
    logoPath: provider.logoPath,
    type: provider.type,
  }))
}

/**
 * Get providers by type for categorized display
 */
export function getProvidersByType() {
  const providers = providerRegistry.getAll()
  const byType: Record<string, typeof providers> = {}
  
  for (const provider of providers) {
    if (!byType[provider.type]) {
      byType[provider.type] = []
    }
    byType[provider.type].push(provider)
  }
  
  return byType
}