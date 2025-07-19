/**
 * Core integration system exports
 * 
 * This module provides the foundational types, interfaces, and services
 * for the third-party integration system.
 */

// Core types
export type {
  TokenData,
  Channel,
  MessageData,
  SlackConfig,
  TeamsConfig,
  SlackConnectionConfig,
  ProviderConfig,
  ConnectionConfig,
  OAuthCallbackParams,
  OAuthState,
  IntegrationStatus,
  ProviderType,
  IntegrationLogEntry,
} from './types'

// Provider interfaces and base classes
export {
  type IntegrationProvider,
  BaseIntegrationProvider,
  ProviderRegistry,
  providerRegistry,
} from './provider'

// Integration service
export {
  IntegrationService,
  type MessageFormatter,
  BaseMessageFormatter,
  integrationService,
} from './service'

// Setup and utility functions
export {
  initializeIntegrations,
  getAvailableProviders,
  getProvidersByType,
} from './setup'

// Provider implementations
export { SlackProvider } from './providers/slack'

// Re-export commonly used types for convenience
export type { Integration, NoteIntegrationConnection, OrganizationNote } from '@prisma/client'