/**
 * Tests for BaseIntegrationProvider
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseIntegrationProvider } from '../../src/provider'
import type { TokenData, Channel, MessageData, OAuthCallbackParams } from '../../src/types'

// Mock encryption module
vi.mock('../../src/encryption', () => ({
  decryptToken: vi.fn().mockResolvedValue('decrypted-token'),
}))

// Create a concrete implementation for testing
class TestProvider extends BaseIntegrationProvider {
  readonly name = 'test'
  readonly type = 'productivity' as const
  readonly displayName = 'Test Provider'
  readonly description = 'Test provider for unit testing'
  readonly logoPath = '/icons/test.svg'

  async getAuthUrl(organizationId: string, redirectUri: string): Promise<string> {
    const state = this.generateOAuthState(organizationId, { redirectUri })
    return `https://test.com/oauth?state=${state}&redirect_uri=${redirectUri}`
  }

  async handleCallback(params: OAuthCallbackParams): Promise<TokenData> {
    this.parseOAuthState(params.state)
    return {
      accessToken: 'test-token',
      expiresAt: new Date(Date.now() + 3600000),
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenData> {
    return {
      accessToken: 'refreshed-token',
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600000),
    }
  }

  async getAvailableChannels(): Promise<Channel[]> {
    return [
      {
        id: 'channel-1',
        name: 'Test Channel',
        type: 'public',
      },
    ]
  }

  async postMessage(): Promise<void> {
    // Test implementation
  }

  async validateConnection(): Promise<boolean> {
    return true
  }

  getConfigSchema(): Record<string, any> {
    return {
      includeNoteContent: {
        type: 'boolean',
        default: true,
        description: 'Include note content in messages',
      },
    }
  }
}

describe('BaseIntegrationProvider', () => {
  let provider: TestProvider

  beforeEach(() => {
    process.env.INTEGRATIONS_OAUTH_STATE_SECRET = 'test-secret-32-characters-long'
    provider = new TestProvider()
  })

  describe('OAuth State Management', () => {
    it('should generate and validate OAuth state', () => {
      const organizationId = 'org-123'
      const additionalData = { redirectUri: 'https://example.com/callback' }

      const state = provider.generateOAuthState(organizationId, additionalData)
      expect(state).toBeTruthy()
      expect(state).toContain('.')

      const parsedState = provider.parseOAuthState(state)
      expect(parsedState.organizationId).toBe(organizationId)
      expect(parsedState.redirectUri).toBe(additionalData.redirectUri)
    })

    it('should throw error for invalid state format', () => {
      expect(() => {
        provider.parseOAuthState('invalid-state')
      }).toThrow('Invalid state: malformed structure')
    })

    it('should throw error for invalid state signature', () => {
      const validState = provider.generateOAuthState('org-123', {})
      const [payload] = validState.split('.')
      const invalidState = `${payload}.invalid-signature`

      expect(() => {
        provider.parseOAuthState(invalidState)
      }).toThrow('Invalid state: signature verification failed')
    })
  })

  describe('Provider Properties', () => {
    it('should have required properties', () => {
      expect(provider.name).toBe('test')
      expect(provider.type).toBe('productivity')
      expect(provider.displayName).toBe('Test Provider')
      expect(provider.description).toBe('Test provider for unit testing')
      expect(provider.logoPath).toBe('/icons/test.svg')
    })
  })

  describe('Abstract Methods', () => {
    it('should implement getAuthUrl', async () => {
      const authUrl = await provider.getAuthUrl('org-123', 'https://example.com/callback')
      expect(authUrl).toContain('https://test.com/oauth')
      expect(authUrl).toContain('state=')
      expect(authUrl).toContain('redirect_uri=')
    })

    it('should implement handleCallback', async () => {
      const params = {
        code: 'test-code',
        state: provider.generateOAuthState('org-123', {}),
      }

      const tokenData = await provider.handleCallback(params)
      expect(tokenData.accessToken).toBe('test-token')
      expect(tokenData.expiresAt).toBeInstanceOf(Date)
    })

    it('should implement getAvailableChannels', async () => {
      const channels = await provider.getAvailableChannels()
      expect(channels).toHaveLength(1)
      expect(channels[0].id).toBe('channel-1')
      expect(channels[0].name).toBe('Test Channel')
    })

    it('should implement postMessage', async () => {
      await expect(provider.postMessage()).resolves.toBeUndefined()
    })

    it('should implement validateConnection', async () => {
      const isValid = await provider.validateConnection()
      expect(isValid).toBe(true)
    })

    it('should implement refreshToken', async () => {
      const tokenData = await provider.refreshToken('refresh-token')
      expect(tokenData.accessToken).toBe('refreshed-token')
      expect(tokenData.refreshToken).toBe('refresh-token')
      expect(tokenData.expiresAt).toBeInstanceOf(Date)
    })

    it('should implement getConfigSchema', () => {
      const schema = provider.getConfigSchema()
      expect(schema).toHaveProperty('includeNoteContent')
      expect(schema.includeNoteContent.type).toBe('boolean')
    })
  })

  describe('Utility Methods', () => {
    it('should format task title with emoji', () => {
      const message = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/note/123',
        changeType: 'created' as const,
      }

      const title = (provider as any).formatTaskTitle(message)
      expect(title).toContain('✨')
      expect(title).toContain('Test Note')
    })

    it('should get correct emoji for change types', () => {
      expect((provider as any).getChangeEmoji('created')).toBe('✨')
      expect((provider as any).getChangeEmoji('updated')).toBe('📝')
      expect((provider as any).getChangeEmoji('deleted')).toBe('🗑️')
      expect((provider as any).getChangeEmoji('unknown')).toBe('📄')
    })

    it('should truncate text correctly', () => {
      const longText = 'a'.repeat(200)
      const truncated = (provider as any).truncateText(longText, 100)
      expect(truncated).toHaveLength(100)
      expect(truncated.endsWith('...')).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing OAuth state secret', () => {
      delete process.env.INTEGRATIONS_OAUTH_STATE_SECRET
      
      expect(() => {
        provider.generateOAuthState('org-123', {})
      }).toThrow('INTEGRATIONS_OAUTH_STATE_SECRET environment variable is required')
    })
  })
})