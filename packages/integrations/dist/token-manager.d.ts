/**
 * Token management service for secure storage, retrieval, and validation
 * of OAuth tokens for third-party integrations
 */
import { type Integration } from '@prisma/client';
import { type TokenValidationResult } from './encryption';
import { type TokenData, type IntegrationProvider } from './types';
/**
 * Token refresh result
 */
export interface TokenRefreshResult {
    success: boolean;
    tokenData?: TokenData;
    error?: string;
    requiresReauth?: boolean;
}
/**
 * Token storage result
 */
export interface TokenStorageResult {
    success: boolean;
    error?: string;
}
/**
 * Token manager service for handling secure token operations
 */
export declare class TokenManager {
    /**
     * Store encrypted token data for an integration
     */
    storeTokenData(integrationId: string, tokenData: TokenData): Promise<TokenStorageResult>;
    /**
     * Retrieve and decrypt token data for an integration
     */
    getTokenData(integrationId: string): Promise<TokenData | null>;
    /**
     * Get a valid access token, refreshing if necessary
     */
    getValidAccessToken(integration: Integration, provider: IntegrationProvider): Promise<string | null>;
    /**
     * Refresh an expired or expiring token
     */
    refreshToken(integration: Integration, provider: IntegrationProvider, refreshToken: string): Promise<TokenRefreshResult>;
    /**
     * Validate token and return validation result
     */
    validateIntegrationToken(integrationId: string): Promise<TokenValidationResult | null>;
    /**
     * Check if multiple integrations need token refresh
     */
    checkTokensNeedingRefresh(organizationId: string): Promise<string[]>;
    /**
     * Revoke and remove token data for an integration
     */
    revokeToken(integrationId: string, provider?: IntegrationProvider): Promise<boolean>;
    /**
     * Log token-related operations
     */
    private logTokenOperation;
    /**
     * Determine if an error requires re-authentication
     */
    private isReauthError;
}
/**
 * Singleton instance of the token manager
 */
export declare const tokenManager: TokenManager;
//# sourceMappingURL=token-manager.d.ts.map