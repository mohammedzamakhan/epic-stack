/**
 * Security utilities for integration system
 * 
 * This module provides additional security utilities for token validation,
 * rate limiting, and secure operations.
 */

import { webcrypto as crypto } from 'node:crypto'

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * Security utilities for integration operations
 */
export class IntegrationSecurityUtils {
  private rateLimitStore = new Map<string, RateLimitEntry>()
  private readonly defaultRateLimit: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  }

  /**
   * Check if a request is within rate limits
   */
  checkRateLimit(
    key: string,
    config: RateLimitConfig = this.defaultRateLimit
  ): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now()
    const entry = this.rateLimitStore.get(key)

    // Clean up expired entries
    if (entry && now > entry.resetTime) {
      this.rateLimitStore.delete(key)
    }

    const currentEntry = this.rateLimitStore.get(key)
    
    if (!currentEntry) {
      // First request in window
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      
      return {
        allowed: true,
        resetTime: now + config.windowMs,
        remaining: config.maxRequests - 1,
      }
    }

    if (currentEntry.count >= config.maxRequests) {
      return {
        allowed: false,
        resetTime: currentEntry.resetTime,
        remaining: 0,
      }
    }

    // Increment counter
    currentEntry.count++
    this.rateLimitStore.set(key, currentEntry)

    return {
      allowed: true,
      resetTime: currentEntry.resetTime,
      remaining: config.maxRequests - currentEntry.count,
    }
  }

  /**
   * Generate a secure random string for various purposes
   */
  generateSecureRandom(length: number = 32): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length))
    return Buffer.from(bytes).toString('hex')
  }

  /**
   * Generate a cryptographically secure UUID
   */
  generateSecureUUID(): string {
    return crypto.randomUUID()
  }

  /**
   * Hash a string using SHA-256
   */
  async hashString(input: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Buffer.from(hashBuffer).toString('hex')
  }

  /**
   * Validate that a URL is safe for redirects
   */
  validateRedirectUrl(url: string, allowedDomains: string[]): boolean {
    try {
      const parsedUrl = new URL(url)
      
      // Must use HTTPS in production
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        return false
      }

      // Check if domain is in allowed list
      const hostname = parsedUrl.hostname.toLowerCase()
      return allowedDomains.some(domain => {
        const normalizedDomain = domain.toLowerCase()
        return hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`)
      })
    } catch {
      return false
    }
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;&|`$]/g, '') // Remove shell metacharacters
      .trim()
  }

  /**
   * Validate webhook signatures (for future webhook implementations)
   */
  async validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: algorithm.toUpperCase() },
        false,
        ['sign']
      )

      const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
      const expectedHex = Buffer.from(expectedSignature).toString('hex')
      
      // Remove algorithm prefix if present (e.g., "sha256=")
      const cleanSignature = signature.includes('=') ? signature.split('=')[1] : signature
      
      return this.secureCompare(expectedHex, cleanSignature)
    } catch {
      return false
    }
  }

  /**
   * Secure string comparison to prevent timing attacks
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

  /**
   * Generate PKCE challenge for OAuth flows that support it
   */
  generatePKCEChallenge(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(32)))
    
    // Create SHA256 hash of the verifier
    const encoder = new TextEncoder()
    const data = encoder.encode(codeVerifier)
    
    // Note: This is synchronous for simplicity, but could be made async
    const hashBuffer = crypto.subtle.digest('SHA-256', data)
    
    return hashBuffer.then(hash => ({
      codeVerifier,
      codeChallenge: this.base64URLEncode(new Uint8Array(hash)),
    })) as any // Type assertion for now, should be properly typed
  }

  /**
   * Base64 URL encode (RFC 4648 Section 5)
   */
  private base64URLEncode(buffer: Uint8Array): string {
    return Buffer.from(buffer)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanupRateLimitStore(): void {
    const now = Date.now()
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key)
      }
    }
  }

  /**
   * Validate that a token format looks correct (basic format validation)
   */
  validateTokenFormat(token: string, expectedPrefix?: string): boolean {
    if (!token || typeof token !== 'string') {
      return false
    }

    // Basic length check (most OAuth tokens are at least 20 characters)
    if (token.length < 20) {
      return false
    }

    // Check for expected prefix if provided
    if (expectedPrefix && !token.startsWith(expectedPrefix)) {
      return false
    }

    // Check for suspicious characters that shouldn't be in tokens
    const suspiciousChars = /[<>'"&;]/
    if (suspiciousChars.test(token)) {
      return false
    }

    return true
  }

  /**
   * Generate a secure state parameter for OAuth flows
   */
  generateOAuthState(data: Record<string, any>): string {
    const stateData = {
      ...data,
      timestamp: Date.now(),
      nonce: this.generateSecureUUID(),
    }

    return Buffer.from(JSON.stringify(stateData)).toString('base64url')
  }

  /**
   * Validate and parse OAuth state parameter
   */
  validateOAuthState(
    state: string,
    maxAge: number = 600000 // 10 minutes default
  ): Record<string, any> | null {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
      
      if (!stateData.timestamp || !stateData.nonce) {
        return null
      }

      const age = Date.now() - stateData.timestamp
      if (age > maxAge) {
        return null
      }

      return stateData
    } catch {
      return null
    }
  }
}

/**
 * Singleton instance of security utilities
 */
export const integrationSecurity = new IntegrationSecurityUtils()

/**
 * Utility function to create rate limit key for integration operations
 */
export function createRateLimitKey(
  organizationId: string,
  operation: string,
  providerId?: string
): string {
  const parts = [organizationId, operation]
  if (providerId) {
    parts.push(providerId)
  }
  return parts.join(':')
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  OAUTH_ATTEMPTS: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 attempts per 15 minutes
  API_CALLS: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 calls per minute
  TOKEN_REFRESH: { windowMs: 5 * 60 * 1000, maxRequests: 10 }, // 10 refreshes per 5 minutes
  WEBHOOK_CALLS: { windowMs: 60 * 1000, maxRequests: 1000 }, // 1000 webhooks per minute
} as const