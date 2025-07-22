/**
 * Integration Manager - Core service for managing third-party integrations
 *
 * This service provides comprehensive integration management including:
 * - Provider registry management
 * - Integration CRUD operations
 * - Note-to-channel connection management
 * - OAuth flow coordination
 * - Token management and refresh
 * - Message posting and notification handling
 */
import { type Integration, type NoteIntegrationConnection, type OrganizationNote, type Organization } from '@prisma/client';
import { type IntegrationProvider } from './provider';
import { type TokenData, type Channel, type OAuthCallbackParams, type IntegrationStatus, type ProviderType, type IntegrationLogEntry } from './types';
/**
 * Extended Integration type with relations
 */
export type IntegrationWithRelations = Integration & {
    organization?: Organization;
    connections?: (NoteIntegrationConnection & {
        note?: OrganizationNote;
    })[];
};
/**
 * Extended Connection type with relations
 */
export type ConnectionWithRelations = NoteIntegrationConnection & {
    integration: Integration;
    note?: OrganizationNote;
};
/**
 * Integration creation parameters
 */
export interface CreateIntegrationParams {
    organizationId: string;
    providerName: string;
    tokenData: TokenData;
    config?: Record<string, any>;
}
/**
 * Connection creation parameters
 */
export interface CreateConnectionParams {
    noteId: string;
    integrationId: string;
    externalId: string;
    config?: Record<string, any>;
}
/**
 * Integration statistics
 */
export interface IntegrationStats {
    totalConnections: number;
    activeConnections: number;
    recentActivity: number;
    lastActivity?: Date;
    errorCount: number;
}
/**
 * Main Integration Manager class
 *
 * Provides centralized management of all integration operations including
 * provider registry, OAuth flows, CRUD operations, and message handling.
 */
export declare class IntegrationManager {
    private static instance;
    /**
     * Get singleton instance of IntegrationManager
     */
    static getInstance(): IntegrationManager;
    /**
     * Register a new integration provider
     * @param provider - Provider instance to register
     */
    registerProvider(provider: IntegrationProvider): void;
    /**
     * Get a provider by name
     * @param name - Provider name
     * @returns Provider instance
     * @throws Error if provider not found
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
     * Create a new integration
     * @param params - Integration creation parameters
     * @returns Created integration
     */
    createIntegration(params: CreateIntegrationParams): Promise<Integration>;
    /**
     * Get integration by ID
     * @param integrationId - Integration ID
     * @returns Integration with relations
     */
    getIntegration(integrationId: string): Promise<IntegrationWithRelations | null>;
    /**
     * Get all integrations for an organization
     * @param organizationId - Organization ID
     * @param type - Optional provider type filter
     * @returns List of integrations
     */
    getOrganizationIntegrations(organizationId: string, type?: ProviderType): Promise<IntegrationWithRelations[]>;
    /**
     * Update integration configuration
     * @param integrationId - Integration ID
     * @param config - New configuration
     * @returns Updated integration
     */
    updateIntegrationConfig(integrationId: string, config: Record<string, any>): Promise<Integration>;
    /**
     * Disconnect an integration and all its connections
     * @param integrationId - Integration ID to disconnect
     */
    disconnectIntegration(integrationId: string): Promise<void>;
    /**
     * Connect a note to a channel
     * @param params - Connection creation parameters
     * @returns Created connection
     */
    connectNoteToChannel(params: CreateConnectionParams): Promise<NoteIntegrationConnection>;
    /**
     * Disconnect a note from a channel
     * @param connectionId - Connection ID to remove
     */
    disconnectNoteFromChannel(connectionId: string): Promise<void>;
    /**
     * Get all connections for a note
     * @param noteId - Note ID
     * @returns List of connections with integration details
     */
    getNoteConnections(noteId: string): Promise<ConnectionWithRelations[]>;
    /**
     * Get all connections for an integration
     * @param integrationId - Integration ID
     * @returns List of connections
     */
    getIntegrationConnections(integrationId: string): Promise<ConnectionWithRelations[]>;
    /**
     * Get available channels for an integration
     * @param integrationId - Integration ID
     * @returns Available channels
     */
    getAvailableChannels(integrationId: string): Promise<Channel[]>;
    /**
     * Handle note updates and post to connected channels
     * @param noteId - Note ID that was updated
     * @param changeType - Type of change
     * @param userId - User who made the change
     */
    handleNoteUpdate(noteId: string, changeType: 'created' | 'updated' | 'deleted', userId: string): Promise<void>;
    /**
     * Post a message to a specific connection
     * @param connection - Connection to post to
     * @param message - Message to post
     */
    private postMessageToConnection;
    /**
     * Refresh expired tokens for an integration
     * @param integrationId - Integration ID
     * @returns Updated integration with new tokens
     */
    refreshIntegrationTokens(integrationId: string): Promise<Integration>;
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
     * Get integration statistics
     * @param integrationId - Integration ID
     * @returns Integration statistics
     */
    getIntegrationStats(integrationId: string): Promise<IntegrationStats>;
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
     * Safely parse JSON string, returning undefined if parsing fails
     * @param jsonString - JSON string to parse
     * @returns Parsed object or undefined
     */
    private safeJsonParse;
}
export declare const integrationManager: IntegrationManager;
//# sourceMappingURL=integration-manager.d.ts.map