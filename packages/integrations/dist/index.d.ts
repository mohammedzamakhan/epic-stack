/**
 * Core integration system exports
 *
 * This module provides the foundational types, interfaces, and services
 * for the third-party integration system.
 */
export type { TokenData, Channel, MessageData, SlackConfig, TeamsConfig, SlackConnectionConfig, ProviderConfig, ConnectionConfig, OAuthCallbackParams, OAuthState, IntegrationStatus, ProviderType, IntegrationLogEntry, } from './types';
export { type IntegrationProvider, BaseIntegrationProvider, ProviderRegistry, providerRegistry, } from './provider';
export { IntegrationService, type MessageFormatter, BaseMessageFormatter, integrationService, } from './service';
export { IntegrationManager, integrationManager, type IntegrationWithRelations, type ConnectionWithRelations, type CreateIntegrationParams, type CreateConnectionParams, type IntegrationStats, } from './integration-manager';
export { IntegrationEncryptionService, integrationEncryption, isEncryptionConfigured, generateNewEncryptionKey, type EncryptedTokenData, type TokenValidationResult, } from './encryption';
export { TokenManager, tokenManager, type TokenRefreshResult, type TokenStorageResult, } from './token-manager';
export { OAuthStateManager, OAuthCallbackHandler, TokenRefreshManager, OAuthFlowManager, } from './oauth-manager';
export { NoteEventHandler, noteEventHandler, type NoteChangeType, type NoteChangeEvent, type NoteEventResult, } from './note-event-handler';
export { NoteHooks, noteHooks, triggerNoteCreated, triggerNoteUpdated, triggerNoteDeleted, NoteOperationWrapper, } from './note-hooks';
export { getAvailableProviders } from './providers';
export type { Integration, NoteIntegrationConnection, OrganizationNote } from '@prisma/client';
//# sourceMappingURL=index.d.ts.map