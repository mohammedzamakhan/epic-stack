/**
 * Core integration provider interface and base implementation
 */
import { type Integration, type NoteIntegrationConnection } from '@prisma/client';
import { type TokenData, type Channel, type MessageData, type OAuthCallbackParams, type ProviderType } from './types';
/**
 * Core interface that all integration providers must implement
 */
export interface IntegrationProvider {
    /** Provider name (e.g., 'slack', 'teams', 'jira') */
    readonly name: string;
    /** Provider type category */
    readonly type: ProviderType;
    /** Provider display name for UI */
    readonly displayName: string;
    /** Provider description */
    readonly description: string;
    /** Provider logo URL or path */
    readonly logoPath: string;
    /**
     * Generate OAuth authorization URL
     * @param organizationId - Organization ID requesting authorization
     * @param redirectUri - OAuth callback URI
     * @param additionalParams - Provider-specific parameters
     * @returns Promise resolving to authorization URL
     */
    getAuthUrl(organizationId: string, redirectUri: string, additionalParams?: Record<string, any>): Promise<string>;
    /**
     * Handle OAuth callback and exchange code for tokens
     * @param params - OAuth callback parameters
     * @returns Promise resolving to token data
     */
    handleCallback(params: OAuthCallbackParams): Promise<TokenData>;
    /**
     * Refresh expired access token
     * @param refreshToken - Refresh token
     * @returns Promise resolving to new token data
     */
    refreshToken(refreshToken: string): Promise<TokenData>;
    /**
     * Get available channels/destinations for the integration
     * @param integration - Integration instance with credentials
     * @returns Promise resolving to available channels
     */
    getAvailableChannels(integration: Integration): Promise<Channel[]>;
    /**
     * Post a message to a connected channel
     * @param connection - Note-to-channel connection
     * @param message - Message data to post
     * @returns Promise that resolves when message is posted
     */
    postMessage(connection: NoteIntegrationConnection & {
        integration: Integration;
    }, message: MessageData): Promise<void>;
    /**
     * Validate that a connection is still active and accessible
     * @param connection - Connection to validate
     * @returns Promise resolving to validation result
     */
    validateConnection(connection: NoteIntegrationConnection & {
        integration: Integration;
    }): Promise<boolean>;
    /**
     * Get provider-specific configuration schema
     * @returns Configuration schema for this provider
     */
    getConfigSchema(): Record<string, any>;
}
/**
 * Base abstract class providing common functionality for integration providers
 */
export declare abstract class BaseIntegrationProvider implements IntegrationProvider {
    abstract readonly name: string;
    abstract readonly type: ProviderType;
    abstract readonly displayName: string;
    abstract readonly description: string;
    abstract readonly logoPath: string;
    abstract getAuthUrl(organizationId: string, redirectUri: string, additionalParams?: Record<string, any>): Promise<string>;
    abstract handleCallback(params: OAuthCallbackParams): Promise<TokenData>;
    abstract refreshToken(refreshToken: string): Promise<TokenData>;
    abstract getAvailableChannels(integration: Integration): Promise<Channel[]>;
    abstract postMessage(connection: NoteIntegrationConnection & {
        integration: Integration;
    }, message: MessageData): Promise<void>;
    abstract validateConnection(connection: NoteIntegrationConnection & {
        integration: Integration;
    }): Promise<boolean>;
    abstract getConfigSchema(): Record<string, any>;
    /**
     * Generate a secure random state string for OAuth
     * @param organizationId - Organization ID
     * @param additionalData - Additional data to include in state
     * @returns Secure state string
     */
    protected generateOAuthState(organizationId: string, additionalData?: Record<string, any>): string;
    /**
     * Parse and validate OAuth state
     * @param state - State string to validate
     * @returns Parsed state data
     * @throws Error if state is invalid or expired
     */
    protected parseOAuthState(state: string): {
        organizationId: string;
        providerName: string;
        timestamp: number;
        [key: string]: any;
    };
    /**
     * Check if a token is expired or about to expire
     * @param expiresAt - Token expiration date
     * @param bufferMinutes - Minutes before expiration to consider expired
     * @returns True if token is expired or about to expire
     */
    protected isTokenExpired(expiresAt?: Date, bufferMinutes?: number): boolean;
    /**
     * Make an authenticated HTTP request to the provider's API
     * @param integration - Integration with credentials
     * @param endpoint - API endpoint
     * @param _options - Fetch options
     * @returns Promise resolving to response
     */
    protected makeAuthenticatedRequest(integration: Integration, endpoint: string, _options?: RequestInit): Promise<Response>;
    /**
     * Handle API errors and convert to appropriate error types
     * @param response - HTTP response
     * @param context - Error context for logging
     */
    protected handleApiError(response: Response, context: string): Promise<never>;
}
/**
 * Registry for managing integration providers
 */
export declare class ProviderRegistry {
    private providers;
    /**
     * Register a new integration provider
     * @param provider - Provider instance to register
     */
    register(provider: IntegrationProvider): void;
    /**
     * Get a provider by name
     * @param name - Provider name
     * @returns Provider instance
     * @throws Error if provider not found
     */
    get(name: string): IntegrationProvider;
    /**
     * Get all registered providers
     * @returns Array of all providers
     */
    getAll(): IntegrationProvider[];
    /**
     * Get providers by type
     * @param type - Provider type to filter by
     * @returns Array of providers matching the type
     */
    getByType(type: ProviderType): IntegrationProvider[];
    /**
     * Check if a provider is registered
     * @param name - Provider name
     * @returns True if provider is registered
     */
    has(name: string): boolean;
    /**
     * Unregister a provider
     * @param name - Provider name to unregister
     */
    unregister(name: string): void;
}
export declare const providerRegistry: ProviderRegistry;
//# sourceMappingURL=provider.d.ts.map