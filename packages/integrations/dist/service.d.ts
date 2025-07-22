/**
 * Core integration service for managing third-party integrations
 *
 * This service acts as a facade over the IntegrationManager, providing
 * a simplified interface for common integration operations.
 */
import { type Integration, type NoteIntegrationConnection, type OrganizationNote } from '@prisma/client';
import { type IntegrationProvider } from './provider';
import { type TokenData, type Channel, type MessageData, type OAuthCallbackParams, type IntegrationStatus, type ProviderType, type IntegrationLogEntry } from './types';
/**
 * Main service class for managing integrations
 *
 * This class provides a simplified interface over the IntegrationManager
 * for common integration operations.
 */
export declare class IntegrationService {
    /**
     * Initiate OAuth flow for a provider
     * @param organizationId - Organization ID
     * @param providerName - Name of the provider to connect
     * @param redirectUri - OAuth callback URI
     * @param additionalParams - Provider-specific parameters
     * @returns Object containing authorization URL and state
     */
    initiateOAuth(organizationId: string, providerName: string, redirectUri: string, additionalParams?: Record<string, any>): Promise<{
        authUrl: string;
        state: string;
    }>;
    /**
     * Handle OAuth callback and create integration
     * @param providerName - Provider name
     * @param params - OAuth callback parameters
     * @returns Created integration
     */
    handleOAuthCallback(providerName: string, params: OAuthCallbackParams): Promise<Integration>;
    /**
     * Get available channels for an integration
     * @param integrationId - Integration ID
     * @returns Available channels
     */
    getAvailableChannels(integrationId: string): Promise<Channel[]>;
    /**
     * Connect a note to a channel
     * @param noteId - Note ID
     * @param integrationId - Integration ID
     * @param channelId - Channel ID
     * @param config - Connection-specific configuration
     * @returns Created connection
     */
    connectNoteToChannel(noteId: string, integrationId: string, channelId: string, config?: Record<string, any>): Promise<NoteIntegrationConnection>;
    /**
     * Disconnect a note from a channel
     * @param connectionId - Connection ID to remove
     */
    disconnectNoteFromChannel(connectionId: string): Promise<void>;
    /**
     * Handle note updates and post to connected channels
     * @param noteId - Note ID that was updated
     * @param changeType - Type of change
     * @param userId - User who made the change
     */
    handleNoteUpdate(noteId: string, changeType: 'created' | 'updated' | 'deleted', userId: string): Promise<void>;
    /**
     * Refresh expired tokens for an integration
     * @param integrationId - Integration ID
     * @returns Updated integration with refreshed tokens
     */
    refreshTokens(integrationId: string): Promise<Integration>;
    /**
     * Check if token needs refresh
     * @param tokenData - Token data to check
     * @returns True if token should be refreshed
     */
    shouldRefreshToken(tokenData: TokenData): boolean;
    /**
     * Check if token is expired
     * @param tokenData - Token data to check
     * @returns True if token is expired
     */
    isTokenExpired(tokenData: TokenData): boolean;
    /**
     * Validate all connections for an integration
     * @param integrationId - Integration ID
     * @returns Validation results
     */
    validateIntegrationConnections(integrationId: string): Promise<{
        valid: number;
        invalid: number;
        errors: string[];
    }>;
    /**
     * Get integration status and health
     * @param integrationId - Integration ID
     * @returns Integration status information
     */
    getIntegrationStatus(integrationId: string): Promise<{
        status: IntegrationStatus;
        lastSync?: Date;
        connectionCount: number;
        recentErrors: IntegrationLogEntry[];
    }>;
    /**
     * Disconnect an integration and all its connections
     * @param integrationId - Integration ID to disconnect
     */
    disconnectIntegration(integrationId: string): Promise<void>;
    /**
     * Get all integrations for an organization
     * @param organizationId - Organization ID
     * @param type - Optional provider type filter
     * @returns List of integrations
     */
    getOrganizationIntegrations(organizationId: string, type?: ProviderType): Promise<Integration[]>;
    /**
     * Get all connections for a note
     * @param noteId - Note ID
     * @returns List of connections
     */
    getNoteConnections(noteId: string): Promise<NoteIntegrationConnection[]>;
    /**
     * Log integration activity
     * @param integrationId - Integration ID
     * @param action - Action performed
     * @param status - Action status
     * @param data - Additional data
     * @param error - Error message if applicable
     */
    logIntegrationActivity(integrationId: string, action: string, status: 'success' | 'error' | 'pending', data?: Record<string, any>, error?: string): Promise<void>;
    /**
     * Format note data into message format
     * @param note - Note data
     * @param changeType - Type of change
     * @param author - Author information
     * @returns Formatted message data
     */
    formatNoteMessage(note: OrganizationNote, changeType: 'created' | 'updated' | 'deleted', author: {
        name: string;
    }): MessageData;
    /**
     * Truncate content to a reasonable length for external posting
     * @param content - Original content
     * @param maxLength - Maximum length (default 500)
     * @returns Truncated content
     */
    private truncateContent;
    /**
     * Generate URL for a note
     * @param note - Note data
     * @returns Note URL
     */
    private generateNoteUrl;
    /**
     * Register a new integration provider
     * @param provider - Provider instance to register
     */
    registerProvider(provider: IntegrationProvider): void;
    /**
     * Get a provider by name
     * @param name - Provider name
     * @returns Provider instance
     */
    getProvider(name: string): IntegrationProvider;
    /**
     * Get all registered providers
     * @returns Array of all providers
     */
    getAllProviders(): IntegrationProvider[];
    /**
     * Get providers by type
     * @param type - Provider type to filter by
     * @returns Array of providers matching the type
     */
    getProvidersByType(type: ProviderType): IntegrationProvider[];
    /**
     * Get integration by ID
     * @param integrationId - Integration ID
     * @returns Integration with relations
     */
    getIntegration(integrationId: string): Promise<import("./integration-manager").IntegrationWithRelations | null>;
    /**
     * Get all connections for an integration
     * @param integrationId - Integration ID
     * @returns List of connections
     */
    getIntegrationConnections(integrationId: string): Promise<import("./integration-manager").ConnectionWithRelations[]>;
    /**
     * Get integration statistics
     * @param integrationId - Integration ID
     * @returns Integration statistics
     */
    getIntegrationStats(integrationId: string): Promise<import("./integration-manager").IntegrationStats>;
    /**
     * Update integration configuration
     * @param integrationId - Integration ID
     * @param config - New configuration
     * @returns Updated integration
     */
    updateIntegrationConfig(integrationId: string, config: Record<string, any>): Promise<{
        organizationId: string;
        providerName: string;
        accessToken: string | null;
        refreshToken: string | null;
        id: string;
        providerType: string;
        tokenExpiresAt: Date | null;
        config: string;
        isActive: boolean;
        lastSyncAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
/**
 * Message formatter interface for different providers
 */
export interface MessageFormatter {
    formatNoteCreated(note: OrganizationNote, author: {
        name: string;
    }): MessageData;
    formatNoteUpdated(note: OrganizationNote, author: {
        name: string;
    }, changes?: string[]): MessageData;
    formatNoteDeleted(noteTitle: string, author: {
        name: string;
    }): MessageData;
}
/**
 * Base message formatter with common functionality
 */
export declare abstract class BaseMessageFormatter implements MessageFormatter {
    abstract formatNoteCreated(note: OrganizationNote, author: {
        name: string;
    }): MessageData;
    abstract formatNoteUpdated(note: OrganizationNote, author: {
        name: string;
    }, changes?: string[]): MessageData;
    abstract formatNoteDeleted(noteTitle: string, author: {
        name: string;
    }): MessageData;
    /**
     * Truncate content for external posting
     * @param content - Original content
     * @param maxLength - Maximum length
     * @returns Truncated content
     */
    protected truncateContent(content: string, maxLength?: number): string;
    /**
     * Generate note URL
     * @param note - Note data
     * @returns Note URL
     */
    protected generateNoteUrl(note: OrganizationNote): string;
}
export declare const integrationService: IntegrationService;
//# sourceMappingURL=service.d.ts.map