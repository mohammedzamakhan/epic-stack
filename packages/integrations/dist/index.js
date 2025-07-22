/**
 * Core integration system exports
 *
 * This module provides the foundational types, interfaces, and services
 * for the third-party integration system.
 */
// Provider interfaces and base classes
export { BaseIntegrationProvider, ProviderRegistry, providerRegistry, } from './provider';
// Integration service and manager
export { IntegrationService, BaseMessageFormatter, integrationService, } from './service';
export { IntegrationManager, integrationManager, } from './integration-manager';
// Encryption and security utilities
export { IntegrationEncryptionService, integrationEncryption, isEncryptionConfigured, generateNewEncryptionKey, } from './encryption';
export { TokenManager, tokenManager, } from './token-manager';
// OAuth flow management
export { OAuthStateManager, OAuthCallbackHandler, TokenRefreshManager, OAuthFlowManager, } from './oauth-manager';
// Note notification system
export { NoteEventHandler, noteEventHandler, } from './note-event-handler';
export { NoteHooks, noteHooks, triggerNoteCreated, triggerNoteUpdated, triggerNoteDeleted, NoteOperationWrapper, } from './note-hooks';
export { getAvailableProviders } from './providers';
//# sourceMappingURL=index.js.map