/**
 * Token encryption and security utilities for third-party integrations
 * 
 * This module provides secure encryption/decryption for OAuth tokens and other
 * sensitive integration data using AES-256-GCM encryption.
 */

import { webcrypto as crypto } from 'node:crypto'
import { type TokenData } from './types'

// Environment variable for encryption key
const ENCRYPTION_KEY_ENV = 'INTEGRATION_ENCRYPTION_KEY' as const

/**
 * Encrypted token data structure
 */
export interface EncryptedTokenData {
  encryptedAccessToken: string
  encryptedRefreshToken?: string
  expiresAt?: Date
  scope?: string
  iv: string // Initialization vector for decryption
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  isValid: boolean
  isExpired: boolean
  expiresIn?: number // seconds until expiration
  needsRefresh: boolean // true if token expires within refresh threshold
}

/**
 * Encryption service for OAuth tokens and sensitive integration data
 */
export class IntegrationEncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32 // 256 bits
  private readonly ivLength = 16 // 128 bits
  private readonly tagLength = 16 // 128 bits
  private readonly refreshThreshold = 300 // 5 minutes in seconds

  private encryptionKey: Buffer | null = null

  /**
   * Initialize the encryption service with the secret key
   */
  private async getEncryptionKey(): Promise<Buffer> {
    if (this.encryptionKey) {
      return this.encryptionKey
    }

    const keyString = process.env[ENCRYPTION_KEY_ENV]
    if (!keyString || keyString.trim() === '') {
      throw new Error(
        `${ENCRYPTION_KEY_ENV} environment variable is required for token encryption`
      )
    }

    // Ensure key is exactly 32 bytes for AES-256
    if (keyString.length !== 64) { // 32 bytes = 64 hex characters
      throw new Error(
        `${ENCRYPTION_KEY_ENV} must be exactly 64 hex characters (32 bytes)`
      )
    }

    this.encryptionKey = Buffer.from(keyString, 'hex')
    return this.encryptionKey
  }

  /**
   * Encrypt token data using AES-256-GCM
   */
  async encryptTokenData(tokenData: TokenData): Promise<EncryptedTokenData> {
    if (!tokenData.accessToken) {
      throw new Error('Access token is required for encryption')
    }

    const key = await this.getEncryptionKey()

    // Encrypt access token (IV is embedded in the encrypted string)
    const encryptedAccessToken = await this.encryptString(tokenData.accessToken, key)

    // Encrypt refresh token if present (each gets its own IV)
    let encryptedRefreshToken: string | undefined
    if (tokenData.refreshToken) {
      encryptedRefreshToken = await this.encryptString(tokenData.refreshToken, key)
    }

    return {
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: tokenData.expiresAt,
      scope: tokenData.scope,
      iv: '', // Keep for backward compatibility but not used
    }
  }

  /**
   * Decrypt token data
   */
  async decryptTokenData(encryptedData: EncryptedTokenData): Promise<TokenData> {
    const key = await this.getEncryptionKey()

    // Decrypt access token (IV is embedded in the encrypted string)
    const accessToken = await this.decryptString(encryptedData.encryptedAccessToken, key)

    // Decrypt refresh token if present (IV is embedded in the encrypted string)
    let refreshToken: string | undefined
    if (encryptedData.encryptedRefreshToken) {
      refreshToken = await this.decryptString(encryptedData.encryptedRefreshToken, key)
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: encryptedData.expiresAt,
      scope: encryptedData.scope,
    }
  }

  /**
   * Encrypt a string using AES-256-GCM
   */
  private async encryptString(plaintext: string, key: Buffer): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength))

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      data
    )

    // Combine IV + encrypted data + auth tag
    const result = new Uint8Array(iv.length + encrypted.byteLength)
    result.set(iv, 0)
    result.set(new Uint8Array(encrypted), iv.length)

    return Buffer.from(result).toString('hex')
  }

  /**
   * Decrypt a string using AES-256-GCM
   */
  private async decryptString(encryptedHex: string, key: Buffer): Promise<string> {
    const encryptedBuffer = Buffer.from(encryptedHex, 'hex')
    
    // Extract IV from the beginning of the encrypted data
    const iv = encryptedBuffer.subarray(0, this.ivLength)
    const encryptedData = encryptedBuffer.subarray(this.ivLength)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        cryptoKey,
        encryptedData
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      throw new Error('Failed to decrypt token data - invalid key or corrupted data')
    }
  }

  /**
   * Validate token expiration and determine if refresh is needed
   */
  validateToken(tokenData: TokenData | EncryptedTokenData): TokenValidationResult {
    const now = new Date()
    const expiresAt = tokenData.expiresAt

    // If no expiration date, assume token is valid but needs refresh check
    if (!expiresAt) {
      return {
        isValid: true,
        isExpired: false,
        needsRefresh: false,
      }
    }

    const isExpired = expiresAt <= now
    const expiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    const needsRefresh = expiresIn <= this.refreshThreshold && expiresIn > 0

    return {
      isValid: !isExpired,
      isExpired,
      expiresIn: isExpired ? 0 : expiresIn,
      needsRefresh,
    }
  }

  /**
   * Generate a secure random state for OAuth flows
   */
  generateOAuthState(organizationId: string, providerName: string): string {
    const stateData = {
      organizationId,
      providerName,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    }

    return Buffer.from(JSON.stringify(stateData)).toString('base64url')
  }

  /**
   * Validate and parse OAuth state
   */
  validateOAuthState(state: string, maxAge: number = 600000): { organizationId: string; providerName: string } {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
        organizationId: string;
        providerName: string;
        timestamp: number;
        nonce: `${string}-${string}-${string}-${string}-${string}`;
    }
      
      if (!stateData.organizationId || !stateData.providerName || !stateData.timestamp) {
        throw new Error('Invalid state format')
      }

      const age = Date.now() - stateData.timestamp
      if (age > maxAge) {
        throw new Error('OAuth state has expired')
      }

      return {
        organizationId: stateData.organizationId,
        providerName: stateData.providerName,
      }
    } catch (error) {
      throw new Error('Invalid or expired OAuth state')
    }
  }

  /**
   * Generate a secure encryption key for environment setup
   * This is a utility method for initial setup - the key should be stored securely
   */
  static generateEncryptionKey(): string {
    const key = crypto.getRandomValues(new Uint8Array(32))
    return Buffer.from(key).toString('hex')
  }

  /**
   * Securely compare two strings to prevent timing attacks
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }

    return result === 0
  }
}

/**
 * Singleton instance of the encryption service
 */
export const integrationEncryption = new IntegrationEncryptionService()

/**
 * Utility function to check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  return !!process.env[ENCRYPTION_KEY_ENV]
}

/**
 * Utility function to generate a new encryption key for setup
 */
export function generateNewEncryptionKey(): string {
  return IntegrationEncryptionService.generateEncryptionKey()
}

/**
 * Simple utility function to encrypt a token string
 * @param token - Token to encrypt
 * @returns Promise resolving to encrypted token string
 */
export async function encryptToken(token: string): Promise<string> {
  const tokenData: TokenData = { accessToken: token }
  const encrypted = await integrationEncryption.encryptTokenData(tokenData)
  return encrypted.encryptedAccessToken
}

/**
 * Simple utility function to decrypt a token string
 * @param encryptedToken - Encrypted token string
 * @returns Promise resolving to decrypted token
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  // For simple token decryption, we need to reconstruct the encrypted data structure
  // This assumes the token was encrypted using encryptToken above
  const key = await integrationEncryption['getEncryptionKey']()
  const encryptedBuffer = Buffer.from(encryptedToken, 'hex')
  
  // Extract IV from the beginning of the encrypted data
  const iv = encryptedBuffer.subarray(0, 16) // ivLength = 16
  const encryptedData = encryptedBuffer.subarray(16)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      encryptedData
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    throw new Error('Failed to decrypt token - invalid key or corrupted data')
  }
}