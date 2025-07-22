/**
 * OAuth flow management system for third-party integrations
 *
 * This module provides utilities for managing OAuth flows including:
 * - State generation and validation
 * - Generic OAuth callback handling
 * - Token refresh with retry logic
 */
import { type TokenData, type OAuthState, type OAuthCallbackParams } from './types';
/**
 * OAuth state management utilities
 */
export declare class OAuthStateManager {
    private static readonly STATE_EXPIRY_MINUTES;
    private static getStateSecret;
    /**
     * Generate a secure OAuth state string
     * @param organizationId - Organization ID
     * @param providerName - Provider name
     * @param redirectUrl - Optional redirect URL after OAuth completion
     * @param additionalData - Additional data to include in state
     * @returns Secure state string
     */
    static generateState(organizationId: string, providerName: string, redirectUrl?: string, additionalData?: Record<string, any>): string;
    /**
     * Validate and parse OAuth state
     * @param state - State string to validate
     * @returns Parsed state data
     * @throws Error if state is invalid or expired
     */
    static validateState(state: string): OAuthState;
    /**
     * Create HMAC signature for state payload
     * @param payload - State payload to sign
     * @returns Signature string
     */
    private static createStateSignature;
}
/**
 * Generic OAuth callback handler
 */
export declare class OAuthCallbackHandler {
    /**
     * Handle OAuth callback from provider
     * @param providerName - Name of the provider
     * @param params - OAuth callback parameters
     * @returns Token data from successful OAuth flow
     * @throws Error if callback handling fails
     */
    static handleCallback(providerName: string, params: OAuthCallbackParams): Promise<{
        tokenData: TokenData;
        stateData: OAuthState;
    }>;
    /**
     * Generate OAuth authorization URL
     * @param organizationId - Organization ID
     * @param providerName - Provider name
     * @param redirectUri - OAuth callback URI
     * @param additionalParams - Additional provider-specific parameters
     * @returns Authorization URL
     */
    static generateAuthUrl(organizationId: string, providerName: string, redirectUri: string, additionalParams?: Record<string, any>): Promise<string>;
}
/**
 * Token refresh manager with retry logic
 */
export declare class TokenRefreshManager {
    private static readonly MAX_RETRIES;
    private static readonly RETRY_DELAYS;
    private static readonly TOKEN_BUFFER_MINUTES;
    /**
     * Refresh token with retry logic
     * @param providerName - Provider name
     * @param refreshToken - Refresh token
     * @param attempt - Current attempt number (for internal use)
     * @returns New token data
     * @throws Error if all retry attempts fail
     */
    static refreshTokenWithRetry(providerName: string, refreshToken: string, attempt?: number): Promise<TokenData>;
    /**
     * Check if a token needs to be refreshed
     * @param tokenData - Current token data
     * @returns True if token should be refreshed
     */
    static shouldRefreshToken(tokenData: TokenData): boolean;
    /**
     * Check if a token is completely expired
     * @param tokenData - Token data to check
     * @returns True if token is expired
     */
    static isTokenExpired(tokenData: TokenData): boolean;
    /**
     * Determine if an error is retryable
     * @param error - Error to check
     * @returns True if error is retryable
     */
    private static isRetryableError;
    /**
     * Delay execution for specified milliseconds
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after delay
     */
    private static delay;
}
/**
 * OAuth flow orchestrator that combines all OAuth management utilities
 */
export declare class OAuthFlowManager {
    /**
     * Start OAuth flow for a provider
     * @param organizationId - Organization ID
     * @param providerName - Provider name
     * @param redirectUri - OAuth callback URI
     * @param additionalParams - Additional parameters
     * @returns Object containing auth URL and state
     */
    static startOAuthFlow(organizationId: string, providerName: string, redirectUri: string, additionalParams?: Record<string, any>): Promise<{
        authUrl: string;
        state: string;
    }>;
    /**
     * Complete OAuth flow by handling callback
     * @param providerName - Provider name
     * @param params - OAuth callback parameters
     * @returns Token data and state information
     */
    static completeOAuthFlow(providerName: string, params: OAuthCallbackParams): Promise<{
        tokenData: TokenData;
        stateData: OAuthState;
    }>;
    /**
     * Refresh token if needed
     * @param providerName - Provider name
     * @param currentTokenData - Current token data
     * @returns Refreshed token data or original if refresh not needed
     */
    static ensureValidToken(providerName: string, currentTokenData: TokenData): Promise<TokenData>;
}
//# sourceMappingURL=oauth-manager.d.ts.map