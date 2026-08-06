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

// Message formatting
export {
	type MessageFormatter,
	BaseMessageFormatter,
	formatNoteMessage,
	truncateContent,
	generateNoteUrl,
} from './message-formatting'

export {
	IntegrationManager,
	integrationManager,
	type IntegrationWithRelations,
	type ConnectionWithRelations,
	type CreateIntegrationParams,
	type CreateConnectionParams,
	type IntegrationStats,
} from './integration-manager'

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

// OAuth flow management
export { oauthFlow } from './oauth-flow'

// Note notification system
export {
	NoteNotifier,
	noteNotifier,
	type NoteChangeType,
	type NoteChangeEvent,
	type NoteEventResult,
} from './note-notifier'

export {
	NoteHooks,
	noteHooks,
	triggerNoteCreated,
	triggerNoteUpdated,
	triggerNoteDeleted,
	NoteOperationWrapper,
} from './note-hooks'

// Project notification system
export {
	ProjectEventHandler,
	projectEventHandler,
} from './project-event-handler'

export { ProjectHooks, projectHooks } from './project-hooks'

export * from './providers'

// Re-export commonly used types for convenience
// Note: These types are currently typed as 'any' because Prisma client generation failed
// They can still be imported directly from '@prisma/client' or '@repo/database'
export type Integration = any
export type NoteIntegrationConnection = any
export type OrganizationNote = any

// Route handlers
export {
	handleOAuthCallback,
	handleJiraSearchUsers,
	handleJiraCurrentUser,
	handleUpdateIntegrationConfig,
	type OAuthCallbackDependencies,
	type JiraSearchUsersDependencies,
	type JiraCurrentUserDependencies,
	type UpdateConfigDependencies,
} from './route-handlers'
