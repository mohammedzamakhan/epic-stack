/**
 * Unit tests for security utilities
 * 
 * This includes tests for rate limiting, webhook signature validation,
 * and other security validation methods used in the integrations package.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { integrationEncryption } from '../../src/encryption'

// Mock security utilities that would be implemented
class MockRateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>()
  private readonly maxAttempts: number
  private readonly windowMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  /**
   * Check if request is within rate limit
   * @param key - Unique identifier for the request (e.g., IP, user ID)
   * @returns True if request is allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(key)

    if (!record || now > record.resetTime) {
      // First attempt or window has reset
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (record.count >= this.maxAttempts) {
      return false
    }

    record.count++
    return true
  }

  /**
   * Get remaining attempts for a key
   * @param key - Unique identifier
   * @returns Number of remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const now = Date.now()
    const record = this.attempts.get(key)

    if (!record || now > record.resetTime) {
      return this.maxAttempts
    }

    return Math.max(0, this.maxAttempts - record.count)
  }

  /**
   * Reset rate limit for a key
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.attempts.delete(key)
  }

  /**
   * Clear all rate limit records
   */
  clear(): void {
    this.attempts.clear()
  }
}

class MockWebhookValidator {
  /**
   * Validate webhook signature using HMAC-SHA256
   * @param payload - Webhook payload
   * @param signature - Provided signature
   * @param secret - Webhook secret
   * @returns True if signature is valid
   */
  static validateSignature(payload: string, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const providedSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature

    return integrationEncryption.secureCompare(expectedSignature, providedSignature)
  }

  /**
   * Validate GitHub webhook signature
   * @param payload - Webhook payload
   * @param signature - GitHub signature header
   * @param secret - Webhook secret
   * @returns True if signature is valid
   */
  static validateGitHubSignature(payload: string, signature: string, secret: string): boolean {
    if (!signature.startsWith('sha256=')) {
      return false
    }

    return this.validateSignature(payload, signature, secret)
  }

  /**
   * Validate Slack webhook signature
   * @param timestamp - Request timestamp
   * @param body - Request body
   * @param signature - Slack signature
   * @param signingSecret - Slack signing secret
   * @returns True if signature is valid
   */
  static validateSlackSignature(
    timestamp: string, 
    body: string, 
    signature: string, 
    signingSecret: string
  ): boolean {
    const crypto = require('crypto')
    
    // Check timestamp to prevent replay attacks (within 5 minutes)
    const requestTime = parseInt(timestamp) * 1000
    const now = Date.now()
    if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
      return false
    }

    const baseString = `v0:${timestamp}:${body}`
    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(baseString)
      .digest('hex')

    const providedSignature = signature.startsWith('v0=') 
      ? signature.slice(3) 
      : signature

    return integrationEncryption.secureCompare(expectedSignature, providedSignature)
  }
}

class MockSecurityValidator {
  /**
   * Validate OAuth state parameter
   * @param state - OAuth state to validate
   * @param expectedOrganizationId - Expected organization ID
   * @param expectedProviderName - Expected provider name
   * @returns True if state is valid
   */
  static validateOAuthState(
    state: string, 
    expectedOrganizationId: string, 
    expectedProviderName: string
  ): boolean {
    try {
      const parsed = integrationEncryption.validateOAuthState(state)
      return parsed.organizationId === expectedOrganizationId && 
             parsed.providerName === expectedProviderName
    } catch {
      return false
    }
  }

  /**
   * Validate API key format
   * @param apiKey - API key to validate
   * @param expectedFormat - Expected format regex
   * @returns True if format is valid
   */
  static validateApiKeyFormat(apiKey: string, expectedFormat: RegExp): boolean {
    return expectedFormat.test(apiKey)
  }

  /**
   * Validate URL for security (prevent SSRF)
   * @param url - URL to validate
   * @param allowedDomains - List of allowed domains
   * @returns True if URL is safe
   */
  static validateUrl(url: string, allowedDomains: string[]): boolean {
    try {
      const parsedUrl = new URL(url)
      
      // Only allow HTTPS
      if (parsedUrl.protocol !== 'https:') {
        return false
      }

      // Check if domain is in allowed list
      return allowedDomains.some(domain => 
        parsedUrl.hostname === domain || 
        parsedUrl.hostname.endsWith(`.${domain}`)
      )
    } catch {
      return false
    }
  }

  /**
   * Sanitize input to prevent injection attacks
   * @param input - Input to sanitize
   * @returns Sanitized input
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;&|`$]/g, '') // Remove shell metacharacters
      .trim()
  }
}

describe('MockRateLimiter', () => {
  let rateLimiter: MockRateLimiter

  beforeEach(() => {
    rateLimiter = new MockRateLimiter(3, 1000) // 3 attempts per second
  })

  describe('isAllowed', () => {
    it('should allow requests within limit', () => {
      const key = 'test-key'

      expect(rateLimiter.isAllowed(key)).toBe(true)
      expect(rateLimiter.isAllowed(key)).toBe(true)
      expect(rateLimiter.isAllowed(key)).toBe(true)
    })

    it('should block requests exceeding limit', () => {
      const key = 'test-key'

      // Use up all attempts
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)

      // Next attempt should be blocked
      expect(rateLimiter.isAllowed(key)).toBe(false)
    })

    it('should reset after time window', async () => {
      const key = 'test-key'
      rateLimiter = new MockRateLimiter(2, 100) // 2 attempts per 100ms

      // Use up attempts
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.isAllowed(key)).toBe(false)

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      expect(rateLimiter.isAllowed(key)).toBe(true)
    })

    it('should handle different keys independently', () => {
      const key1 = 'key1'
      const key2 = 'key2'

      // Use up attempts for key1
      rateLimiter.isAllowed(key1)
      rateLimiter.isAllowed(key1)
      rateLimiter.isAllowed(key1)
      expect(rateLimiter.isAllowed(key1)).toBe(false)

      // key2 should still be allowed
      expect(rateLimiter.isAllowed(key2)).toBe(true)
    })
  })

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new key', () => {
      const key = 'new-key'
      expect(rateLimiter.getRemainingAttempts(key)).toBe(3)
    })

    it('should decrease remaining attempts', () => {
      const key = 'test-key'

      expect(rateLimiter.getRemainingAttempts(key)).toBe(3)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.getRemainingAttempts(key)).toBe(2)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.getRemainingAttempts(key)).toBe(1)
    })

    it('should return 0 when limit exceeded', () => {
      const key = 'test-key'

      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key) // This should be blocked

      expect(rateLimiter.getRemainingAttempts(key)).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset rate limit for specific key', () => {
      const key = 'test-key'

      // Use up attempts
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      rateLimiter.isAllowed(key)
      expect(rateLimiter.isAllowed(key)).toBe(false)

      // Reset and try again
      rateLimiter.reset(key)
      expect(rateLimiter.isAllowed(key)).toBe(true)
    })
  })

  describe('clear', () => {
    it('should clear all rate limit records', () => {
      const key1 = 'key1'
      const key2 = 'key2'

      // Use up attempts for both keys
      rateLimiter.isAllowed(key1)
      rateLimiter.isAllowed(key1)
      rateLimiter.isAllowed(key1)
      rateLimiter.isAllowed(key2)
      rateLimiter.isAllowed(key2)

      rateLimiter.clear()

      // Both should have full attempts again
      expect(rateLimiter.getRemainingAttempts(key1)).toBe(3)
      expect(rateLimiter.getRemainingAttempts(key2)).toBe(3)
    })
  })
})

describe('MockWebhookValidator', () => {
  const testSecret = 'test-webhook-secret'
  const testPayload = '{"test": "payload"}'

  describe('validateSignature', () => {
    it('should validate correct signature', () => {
      const crypto = require('crypto')
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex')

      const result = MockWebhookValidator.validateSignature(testPayload, signature, testSecret)
      expect(result).toBe(true)
    })

    it('should reject incorrect signature', () => {
      const wrongSignature = 'incorrect-signature'

      const result = MockWebhookValidator.validateSignature(testPayload, wrongSignature, testSecret)
      expect(result).toBe(false)
    })

    it('should handle sha256= prefix', () => {
      const crypto = require('crypto')
      const signature = 'sha256=' + crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex')

      const result = MockWebhookValidator.validateSignature(testPayload, signature, testSecret)
      expect(result).toBe(true)
    })
  })

  describe('validateGitHubSignature', () => {
    it('should validate GitHub signature format', () => {
      const crypto = require('crypto')
      const signature = 'sha256=' + crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex')

      const result = MockWebhookValidator.validateGitHubSignature(testPayload, signature, testSecret)
      expect(result).toBe(true)
    })

    it('should reject signature without sha256= prefix', () => {
      const crypto = require('crypto')
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex')

      const result = MockWebhookValidator.validateGitHubSignature(testPayload, signature, testSecret)
      expect(result).toBe(false)
    })
  })

  describe('validateSlackSignature', () => {
    it('should validate correct Slack signature', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const crypto = require('crypto')
      const baseString = `v0:${timestamp}:${testPayload}`
      const signature = 'v0=' + crypto
        .createHmac('sha256', testSecret)
        .update(baseString)
        .digest('hex')

      const result = MockWebhookValidator.validateSlackSignature(
        timestamp, 
        testPayload, 
        signature, 
        testSecret
      )
      expect(result).toBe(true)
    })

    it('should reject old timestamps', () => {
      const oldTimestamp = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString() // 10 minutes ago
      const crypto = require('crypto')
      const baseString = `v0:${oldTimestamp}:${testPayload}`
      const signature = 'v0=' + crypto
        .createHmac('sha256', testSecret)
        .update(baseString)
        .digest('hex')

      const result = MockWebhookValidator.validateSlackSignature(
        oldTimestamp, 
        testPayload, 
        signature, 
        testSecret
      )
      expect(result).toBe(false)
    })

    it('should handle signature without v0= prefix', () => {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      const crypto = require('crypto')
      const baseString = `v0:${timestamp}:${testPayload}`
      const signature = crypto
        .createHmac('sha256', testSecret)
        .update(baseString)
        .digest('hex')

      const result = MockWebhookValidator.validateSlackSignature(
        timestamp, 
        testPayload, 
        signature, 
        testSecret
      )
      expect(result).toBe(true)
    })
  })
})

describe('MockSecurityValidator', () => {
  beforeEach(() => {
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('validateOAuthState', () => {
    it('should validate correct OAuth state', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'

      const state = integrationEncryption.generateOAuthState(organizationId, providerName)
      const result = MockSecurityValidator.validateOAuthState(state, organizationId, providerName)

      expect(result).toBe(true)
    })

    it('should reject state with wrong organization ID', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'

      const state = integrationEncryption.generateOAuthState(organizationId, providerName)
      const result = MockSecurityValidator.validateOAuthState(state, 'wrong-org', providerName)

      expect(result).toBe(false)
    })

    it('should reject state with wrong provider name', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'

      const state = integrationEncryption.generateOAuthState(organizationId, providerName)
      const result = MockSecurityValidator.validateOAuthState(state, organizationId, 'wrong-provider')

      expect(result).toBe(false)
    })

    it('should reject invalid state format', () => {
      const result = MockSecurityValidator.validateOAuthState(
        'invalid-state', 
        'org-123', 
        'slack'
      )

      expect(result).toBe(false)
    })
  })

  describe('validateApiKeyFormat', () => {
    it('should validate API key with correct format', () => {
      const apiKey = 'sk-1234567890abcdef'
      const format = /^sk-[a-f0-9]{16}$/

      const result = MockSecurityValidator.validateApiKeyFormat(apiKey, format)
      expect(result).toBe(true)
    })

    it('should reject API key with wrong format', () => {
      const apiKey = 'invalid-key'
      const format = /^sk-[a-f0-9]{16}$/

      const result = MockSecurityValidator.validateApiKeyFormat(apiKey, format)
      expect(result).toBe(false)
    })

    it('should handle different API key formats', () => {
      const slackKey = 'xoxb-1234567890-abcdef'
      const slackFormat = /^xoxb-\d+-[a-zA-Z0-9]+$/

      const result = MockSecurityValidator.validateApiKeyFormat(slackKey, slackFormat)
      expect(result).toBe(true)
    })
  })

  describe('validateUrl', () => {
    it('should allow HTTPS URLs from allowed domains', () => {
      const url = 'https://api.slack.com/api/chat.postMessage'
      const allowedDomains = ['slack.com', 'github.com']

      const result = MockSecurityValidator.validateUrl(url, allowedDomains)
      expect(result).toBe(true)
    })

    it('should allow subdomains of allowed domains', () => {
      const url = 'https://hooks.slack.com/services/webhook'
      const allowedDomains = ['slack.com']

      const result = MockSecurityValidator.validateUrl(url, allowedDomains)
      expect(result).toBe(true)
    })

    it('should reject HTTP URLs', () => {
      const url = 'http://api.slack.com/api/chat.postMessage'
      const allowedDomains = ['slack.com']

      const result = MockSecurityValidator.validateUrl(url, allowedDomains)
      expect(result).toBe(false)
    })

    it('should reject URLs from disallowed domains', () => {
      const url = 'https://malicious.com/api/endpoint'
      const allowedDomains = ['slack.com', 'github.com']

      const result = MockSecurityValidator.validateUrl(url, allowedDomains)
      expect(result).toBe(false)
    })

    it('should handle invalid URLs', () => {
      const url = 'not-a-valid-url'
      const allowedDomains = ['slack.com']

      const result = MockSecurityValidator.validateUrl(url, allowedDomains)
      expect(result).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = MockSecurityValidator.sanitizeInput(input)

      expect(result).toBe('Hello scriptalert(xss)/script World')
    })

    it('should remove quotes', () => {
      const input = 'Hello "World" and \'Universe\''
      const result = MockSecurityValidator.sanitizeInput(input)

      expect(result).toBe('Hello World and Universe')
    })

    it('should remove shell metacharacters', () => {
      const input = 'Hello; rm -rf / && echo "pwned" | cat'
      const result = MockSecurityValidator.sanitizeInput(input)

      expect(result).toBe('Hello rm -rf /  echo pwned  cat')
    })

    it('should trim whitespace', () => {
      const input = '  Hello World  '
      const result = MockSecurityValidator.sanitizeInput(input)

      expect(result).toBe('Hello World')
    })

    it('should handle empty input', () => {
      const input = ''
      const result = MockSecurityValidator.sanitizeInput(input)

      expect(result).toBe('')
    })
  })
})

describe('Integration with existing security utilities', () => {
  beforeEach(() => {
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('secureCompare from encryption service', () => {
    it('should securely compare identical strings', () => {
      const str1 = 'test-string'
      const str2 = 'test-string'

      const result = integrationEncryption.secureCompare(str1, str2)
      expect(result).toBe(true)
    })

    it('should securely compare different strings', () => {
      const str1 = 'test-string'
      const str2 = 'different-string'

      const result = integrationEncryption.secureCompare(str1, str2)
      expect(result).toBe(false)
    })

    it('should handle strings of different lengths', () => {
      const str1 = 'short'
      const str2 = 'much-longer-string'

      const result = integrationEncryption.secureCompare(str1, str2)
      expect(result).toBe(false)
    })
  })

  describe('OAuth state validation from encryption service', () => {
    it('should validate OAuth state', () => {
      const organizationId = 'org-123'
      const providerName = 'slack'

      const state = integrationEncryption.generateOAuthState(organizationId, providerName)
      const parsed = integrationEncryption.validateOAuthState(state)

      expect(parsed.organizationId).toBe(organizationId)
      expect(parsed.providerName).toBe(providerName)
    })

    it('should reject expired OAuth state', async () => {
      const organizationId = 'org-123'
      const providerName = 'slack'

      const state = integrationEncryption.generateOAuthState(organizationId, providerName)

      // Wait a bit to ensure the state is expired
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(() => {
        integrationEncryption.validateOAuthState(state, 1) // 1ms max age
      }).toThrow('Invalid or expired OAuth state')
    })
  })
})