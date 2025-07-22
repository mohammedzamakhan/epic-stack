/**
 * Token encryption and security utilities for third-party integrations
 *
 * This module provides secure encryption/decryption for OAuth tokens and other
 * sensitive integration data using AES-256-GCM encryption.
 */
import { webcrypto as crypto } from 'node:crypto';
// Environment variable for encryption key
const ENCRYPTION_KEY_ENV = process.env.INTEGRATION_ENCRYPTION_KEY;
/**
 * Encryption service for OAuth tokens and sensitive integration data
 */
export class IntegrationEncryptionService {
    algorithm = 'aes-256-gcm';
    keyLength = 32; // 256 bits
    ivLength = 16; // 128 bits
    tagLength = 16; // 128 bits
    refreshThreshold = 300; // 5 minutes in seconds
    encryptionKey = null;
    /**
     * Initialize the encryption service with the secret key
     */
    async getEncryptionKey() {
        if (this.encryptionKey) {
            return this.encryptionKey;
        }
        const keyString = process.env[ENCRYPTION_KEY_ENV];
        if (!keyString) {
            throw new Error(`${ENCRYPTION_KEY_ENV} environment variable is required for token encryption`);
        }
        // Ensure key is exactly 32 bytes for AES-256
        if (keyString.length !== 64) { // 32 bytes = 64 hex characters
            throw new Error(`${ENCRYPTION_KEY_ENV} must be exactly 64 hex characters (32 bytes)`);
        }
        this.encryptionKey = Buffer.from(keyString, 'hex');
        return this.encryptionKey;
    }
    /**
     * Encrypt token data using AES-256-GCM
     */
    async encryptTokenData(tokenData) {
        if (!tokenData.accessToken) {
            throw new Error('Access token is required for encryption');
        }
        const key = await this.getEncryptionKey();
        const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
        // Encrypt access token
        const encryptedAccessToken = await this.encryptString(tokenData.accessToken, key, iv);
        // Encrypt refresh token if present
        let encryptedRefreshToken;
        if (tokenData.refreshToken) {
            const refreshIv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            encryptedRefreshToken = await this.encryptString(tokenData.refreshToken, key, refreshIv);
        }
        return {
            encryptedAccessToken,
            encryptedRefreshToken,
            expiresAt: tokenData.expiresAt,
            scope: tokenData.scope,
            iv: Buffer.from(iv).toString('hex'),
        };
    }
    /**
     * Decrypt token data
     */
    async decryptTokenData(encryptedData) {
        const key = await this.getEncryptionKey();
        const iv = Buffer.from(encryptedData.iv, 'hex');
        // Decrypt access token
        const accessToken = await this.decryptString(encryptedData.encryptedAccessToken, key, iv);
        // Decrypt refresh token if present
        let refreshToken;
        if (encryptedData.encryptedRefreshToken) {
            // For refresh tokens, we need to extract the IV from the encrypted data
            refreshToken = await this.decryptString(encryptedData.encryptedRefreshToken, key, iv);
        }
        return {
            accessToken,
            refreshToken,
            expiresAt: encryptedData.expiresAt,
            scope: encryptedData.scope,
        };
    }
    /**
     * Encrypt a string using AES-256-GCM
     */
    async encryptString(plaintext, key, iv) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
        const encrypted = await crypto.subtle.encrypt({
            name: 'AES-GCM',
            iv: iv,
        }, cryptoKey, data);
        // Combine IV + encrypted data + auth tag
        const result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encrypted), iv.length);
        return Buffer.from(result).toString('hex');
    }
    /**
     * Decrypt a string using AES-256-GCM
     */
    async decryptString(encryptedHex, key, expectedIv) {
        const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
        // Extract IV from the beginning of the encrypted data
        const iv = expectedIv || encryptedBuffer.subarray(0, this.ivLength);
        const encryptedData = expectedIv
            ? encryptedBuffer
            : encryptedBuffer.subarray(this.ivLength);
        const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
        try {
            const decrypted = await crypto.subtle.decrypt({
                name: 'AES-GCM',
                iv: iv,
            }, cryptoKey, encryptedData);
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        }
        catch (error) {
            throw new Error('Failed to decrypt token data - invalid key or corrupted data');
        }
    }
    /**
     * Validate token expiration and determine if refresh is needed
     */
    validateToken(tokenData) {
        const now = new Date();
        const expiresAt = tokenData.expiresAt;
        // If no expiration date, assume token is valid but needs refresh check
        if (!expiresAt) {
            return {
                isValid: true,
                isExpired: false,
                needsRefresh: false,
            };
        }
        const isExpired = expiresAt <= now;
        const expiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
        const needsRefresh = expiresIn <= this.refreshThreshold && expiresIn > 0;
        return {
            isValid: !isExpired,
            isExpired,
            expiresIn: isExpired ? 0 : expiresIn,
            needsRefresh,
        };
    }
    /**
     * Generate a secure random state for OAuth flows
     */
    generateOAuthState(organizationId, providerName) {
        const stateData = {
            organizationId,
            providerName,
            timestamp: Date.now(),
            nonce: crypto.randomUUID(),
        };
        return Buffer.from(JSON.stringify(stateData)).toString('base64url');
    }
    /**
     * Validate and parse OAuth state
     */
    validateOAuthState(state, maxAge = 600000) {
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
            if (!stateData.organizationId || !stateData.providerName || !stateData.timestamp) {
                throw new Error('Invalid state format');
            }
            const age = Date.now() - stateData.timestamp;
            if (age > maxAge) {
                throw new Error('OAuth state has expired');
            }
            return {
                organizationId: stateData.organizationId,
                providerName: stateData.providerName,
            };
        }
        catch (error) {
            throw new Error('Invalid or expired OAuth state');
        }
    }
    /**
     * Generate a secure encryption key for environment setup
     * This is a utility method for initial setup - the key should be stored securely
     */
    static generateEncryptionKey() {
        const key = crypto.getRandomValues(new Uint8Array(32));
        return Buffer.from(key).toString('hex');
    }
    /**
     * Securely compare two strings to prevent timing attacks
     */
    secureCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
}
/**
 * Singleton instance of the encryption service
 */
export const integrationEncryption = new IntegrationEncryptionService();
/**
 * Utility function to check if encryption is properly configured
 */
export function isEncryptionConfigured() {
    return !!process.env[ENCRYPTION_KEY_ENV];
}
/**
 * Utility function to generate a new encryption key for setup
 */
export function generateNewEncryptionKey() {
    return IntegrationEncryptionService.generateEncryptionKey();
}
/**
 * Simple utility function to encrypt a token string
 * @param token - Token to encrypt
 * @returns Promise resolving to encrypted token string
 */
export async function encryptToken(token) {
    const tokenData = { accessToken: token };
    const encrypted = await integrationEncryption.encryptTokenData(tokenData);
    return encrypted.encryptedAccessToken;
}
/**
 * Simple utility function to decrypt a token string
 * @param encryptedToken - Encrypted token string
 * @returns Promise resolving to decrypted token
 */
export async function decryptToken(encryptedToken) {
    // For simple token decryption, we need to reconstruct the encrypted data structure
    // This assumes the token was encrypted using encryptToken above
    const key = await integrationEncryption['getEncryptionKey']();
    const encryptedBuffer = Buffer.from(encryptedToken, 'hex');
    // Extract IV from the beginning of the encrypted data
    const iv = encryptedBuffer.subarray(0, 16); // ivLength = 16
    const encryptedData = encryptedBuffer.subarray(16);
    const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
    try {
        const decrypted = await crypto.subtle.decrypt({
            name: 'AES-GCM',
            iv: iv,
        }, cryptoKey, encryptedData);
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
    catch (error) {
        throw new Error('Failed to decrypt token - invalid key or corrupted data');
    }
}
//# sourceMappingURL=encryption.js.map