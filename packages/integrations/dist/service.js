/**
 * Core integration service for managing third-party integrations
 *
 * This service acts as a facade over the IntegrationManager, providing
 * a simplified interface for common integration operations.
 */
import { integrationManager } from './integration-manager';
/**
 * Main service class for managing integrations
 *
 * This class provides a simplified interface over the IntegrationManager
 * for common integration operations.
 */
export class IntegrationService {
    /**
     * Initiate OAuth flow for a provider
     * @param organizationId - Organization ID
     * @param providerName - Name of the provider to connect
     * @param redirectUri - OAuth callback URI
     * @param additionalParams - Provider-specific parameters
     * @returns Object containing authorization URL and state
     */
    async initiateOAuth(organizationId, providerName, redirectUri, additionalParams) {
        return integrationManager.initiateOAuth(organizationId, providerName, redirectUri, additionalParams);
    }
    /**
     * Handle OAuth callback and create integration
     * @param providerName - Provider name
     * @param params - OAuth callback parameters
     * @returns Created integration
     */
    async handleOAuthCallback(providerName, params) {
        return integrationManager.handleOAuthCallback(providerName, params);
    }
    /**
     * Get available channels for an integration
     * @param integrationId - Integration ID
     * @returns Available channels
     */
    async getAvailableChannels(integrationId) {
        return integrationManager.getAvailableChannels(integrationId);
    }
    /**
     * Connect a note to a channel
     * @param noteId - Note ID
     * @param integrationId - Integration ID
     * @param channelId - Channel ID
     * @param config - Connection-specific configuration
     * @returns Created connection
     */
    async connectNoteToChannel(noteId, integrationId, channelId, config) {
        return integrationManager.connectNoteToChannel({
            noteId,
            integrationId,
            externalId: channelId,
            config
        });
    }
    /**
     * Disconnect a note from a channel
     * @param connectionId - Connection ID to remove
     */
    async disconnectNoteFromChannel(connectionId) {
        return integrationManager.disconnectNoteFromChannel(connectionId);
    }
    /**
     * Handle note updates and post to connected channels
     * @param noteId - Note ID that was updated
     * @param changeType - Type of change
     * @param userId - User who made the change
     */
    async handleNoteUpdate(noteId, changeType, userId) {
        return integrationManager.handleNoteUpdate(noteId, changeType, userId);
    }
    /**
     * Refresh expired tokens for an integration
     * @param integrationId - Integration ID
     * @returns Updated integration with refreshed tokens
     */
    async refreshTokens(integrationId) {
        return integrationManager.refreshIntegrationTokens(integrationId);
    }
    /**
     * Check if token needs refresh
     * @param tokenData - Token data to check
     * @returns True if token should be refreshed
     */
    shouldRefreshToken(tokenData) {
        const { TokenRefreshManager } = require('./oauth-manager');
        return TokenRefreshManager.shouldRefreshToken(tokenData);
    }
    /**
     * Check if token is expired
     * @param tokenData - Token data to check
     * @returns True if token is expired
     */
    isTokenExpired(tokenData) {
        const { TokenRefreshManager } = require('./oauth-manager');
        return TokenRefreshManager.isTokenExpired(tokenData);
    }
    /**
     * Validate all connections for an integration
     * @param integrationId - Integration ID
     * @returns Validation results
     */
    async validateIntegrationConnections(integrationId) {
        return integrationManager.validateIntegrationConnections(integrationId);
    }
    /**
     * Get integration status and health
     * @param integrationId - Integration ID
     * @returns Integration status information
     */
    async getIntegrationStatus(integrationId) {
        return integrationManager.getIntegrationStatus(integrationId);
    }
    /**
     * Disconnect an integration and all its connections
     * @param integrationId - Integration ID to disconnect
     */
    async disconnectIntegration(integrationId) {
        return integrationManager.disconnectIntegration(integrationId);
    }
    /**
     * Get all integrations for an organization
     * @param organizationId - Organization ID
     * @param type - Optional provider type filter
     * @returns List of integrations
     */
    async getOrganizationIntegrations(organizationId, type) {
        return integrationManager.getOrganizationIntegrations(organizationId, type);
    }
    /**
     * Get all connections for a note
     * @param noteId - Note ID
     * @returns List of connections
     */
    async getNoteConnections(noteId) {
        return integrationManager.getNoteConnections(noteId);
    }
    /**
     * Log integration activity
     * @param integrationId - Integration ID
     * @param action - Action performed
     * @param status - Action status
     * @param data - Additional data
     * @param error - Error message if applicable
     */
    async logIntegrationActivity(integrationId, action, status, data, error) {
        return integrationManager.logIntegrationActivity(integrationId, action, status, data, error);
    }
    /**
     * Format note data into message format
     * @param note - Note data
     * @param changeType - Type of change
     * @param author - Author information
     * @returns Formatted message data
     */
    formatNoteMessage(note, changeType, author) {
        return {
            title: note.title,
            content: this.truncateContent(note.content || ''),
            author: author.name,
            noteUrl: this.generateNoteUrl(note),
            changeType,
        };
    }
    /**
     * Truncate content to a reasonable length for external posting
     * @param content - Original content
     * @param maxLength - Maximum length (default 500)
     * @returns Truncated content
     */
    truncateContent(content, maxLength = 500) {
        if (content.length <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength - 3) + '...';
    }
    /**
     * Generate URL for a note
     * @param note - Note data
     * @returns Note URL
     */
    generateNoteUrl(note) {
        // This will need to be implemented based on the app's routing structure
        return `/notes/${note.id}`;
    }
    // Provider Management Methods
    /**
     * Register a new integration provider
     * @param provider - Provider instance to register
     */
    registerProvider(provider) {
        return integrationManager.registerProvider(provider);
    }
    /**
     * Get a provider by name
     * @param name - Provider name
     * @returns Provider instance
     */
    getProvider(name) {
        return integrationManager.getProvider(name);
    }
    /**
     * Get all registered providers
     * @returns Array of all providers
     */
    getAllProviders() {
        return integrationManager.getAllProviders();
    }
    /**
     * Get providers by type
     * @param type - Provider type to filter by
     * @returns Array of providers matching the type
     */
    getProvidersByType(type) {
        return integrationManager.getProvidersByType(type);
    }
    // Additional Integration Management Methods
    /**
     * Get integration by ID
     * @param integrationId - Integration ID
     * @returns Integration with relations
     */
    async getIntegration(integrationId) {
        return integrationManager.getIntegration(integrationId);
    }
    /**
     * Get all connections for an integration
     * @param integrationId - Integration ID
     * @returns List of connections
     */
    async getIntegrationConnections(integrationId) {
        return integrationManager.getIntegrationConnections(integrationId);
    }
    /**
     * Get integration statistics
     * @param integrationId - Integration ID
     * @returns Integration statistics
     */
    async getIntegrationStats(integrationId) {
        return integrationManager.getIntegrationStats(integrationId);
    }
    /**
     * Update integration configuration
     * @param integrationId - Integration ID
     * @param config - New configuration
     * @returns Updated integration
     */
    async updateIntegrationConfig(integrationId, config) {
        return integrationManager.updateIntegrationConfig(integrationId, config);
    }
}
/**
 * Base message formatter with common functionality
 */
export class BaseMessageFormatter {
    /**
     * Truncate content for external posting
     * @param content - Original content
     * @param maxLength - Maximum length
     * @returns Truncated content
     */
    truncateContent(content, maxLength = 500) {
        if (content.length <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength - 3) + '...';
    }
    /**
     * Generate note URL
     * @param note - Note data
     * @returns Note URL
     */
    generateNoteUrl(note) {
        return `/notes/${note.id}`;
    }
}
// Global integration service instance
export const integrationService = new IntegrationService();
//# sourceMappingURL=service.js.map