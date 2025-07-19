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

// Integration service and manager
export {
    IntegrationService,
    type MessageFormatter,
    BaseMessageFormatter,
    integrationService,
} from './service'

export {
    IntegrationManager,
    integrationManager,
    type IntegrationWithRelations,
    type ConnectionWithRelations,
    type CreateIntegrationParams,
    type CreateConnectionParams,
    type IntegrationStats,
} from './integration-manager'

// Setup and utility functions
export {
    initializeIntegrations,
    getAvailableProviders,
    getProvidersByType,
} from './setup'

// Encryption and security utilities
export {
    IntegrationEncryptionService,
    integrationEncryption,
    isEncryptionConfigured,
    generateNewEncryptionKey,
    type EncryptedTokenData,
    type TokenValidationResult,
} from './encryption'

export {
    TokenManager,
    tokenManager,
    type TokenRefreshResult,
    type TokenStorageResult,
} from './token-manager'

export {
    IntegrationSecurityUtils,
    integrationSecurity,
    createRateLimitKey,
    RATE_LIMITS,
    type RateLimitConfig,
} from './security'

// Provider implementations
export { SlackProvider } from './providers/slack'

// OAuth flow management
export {
    OAuthStateManager,
    OAuthCallbackHandler,
    TokenRefreshManager,
    OAuthFlowManager,
} from './oauth-manager'

// Re-export commonly used types for convenience
export type { Integration, NoteIntegrationConnection, OrganizationNote } from '@prisma/client'