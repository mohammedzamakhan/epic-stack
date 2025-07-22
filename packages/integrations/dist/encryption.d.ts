/**
 * Token encryption and security utilities for third-party integrations
 *
 * This module provides secure encryption/decryption for OAuth tokens and other
 * sensitive integration data using AES-256-GCM encryption.
 */
import { type TokenData } from './types';
/**
 * Encrypted token data structure
 */
export interface EncryptedTokenData {
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    expiresAt?: Date;
    scope?: string;
    iv: string;
}
/**
 * Token validation result
 */
export interface TokenValidationResult {
    isValid: boolean;
    isExpired: boolean;
    expiresIn?: number;
    needsRefresh: boolean;
}
/**
 * Encryption service for OAuth tokens and sensitive integration data
 */
export declare class IntegrationEncryptionService {
    private readonly algorithm;
    private readonly keyLength;
    private readonly ivLength;
    private readonly tagLength;
    private readonly refreshThreshold;
    private encryptionKey;
    /**
     * Initialize the encryption service with the secret key
     */
    private getEncryptionKey;
    /**
     * Encrypt token data using AES-256-GCM
     */
    encryptTokenData(tokenData: TokenData): Promise<EncryptedTokenData>;
    /**
     * Decrypt token data
     */
    decryptTokenData(encryptedData: EncryptedTokenData): Promise<TokenData>;
    /**
     * Encrypt a string using AES-256-GCM
     */
    private encryptString;
    /**
     * Decrypt a string using AES-256-GCM
     */
    private decryptString;
    /**
     * Validate token expiration and determine if refresh is needed
     */
    validateToken(tokenData: TokenData | EncryptedTokenData): TokenValidationResult;
    /**
     * Generate a secure random state for OAuth flows
     */
    generateOAuthState(organizationId: string, providerName: string): string;
    /**
     * Validate and parse OAuth state
     */
    validateOAuthState(state: string, maxAge?: number): {
        organizationId: string;
        providerName: string;
    };
    /**
     * Generate a secure encryption key for environment setup
     * This is a utility method for initial setup - the key should be stored securely
     */
    static generateEncryptionKey(): string;
    /**
     * Securely compare two strings to prevent timing attacks
     */
    secureCompare(a: string, b: string): boolean;
}
/**
 * Singleton instance of the encryption service
 */
export declare const integrationEncryption: IntegrationEncryptionService;
/**
 * Utility function to check if encryption is properly configured
 */
export declare function isEncryptionConfigured(): boolean;
/**
 * Utility function to generate a new encryption key for setup
 */
export declare function generateNewEncryptionKey(): string;
/**
 * Simple utility function to encrypt a token string
 * @param token - Token to encrypt
 * @returns Promise resolving to encrypted token string
 */
export declare function encryptToken(token: string): Promise<string>;
/**
 * Simple utility function to decrypt a token string
 * @param encryptedToken - Encrypted token string
 * @returns Promise resolving to decrypted token
 */
export declare function decryptToken(encryptedToken: string): Promise<string>;
//# sourceMappingURL=encryption.d.ts.map