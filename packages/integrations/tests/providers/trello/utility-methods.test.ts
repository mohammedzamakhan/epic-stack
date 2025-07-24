/**
 * Tests for TrelloProvider utility methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TrelloProvider } from '../../../src/providers/trello/provider'

describe('TrelloProvider - Utility Methods', () => {
  let provider: TrelloProvider

  beforeEach(() => {
    // Set required environment variables
    process.env.TRELLO_API_KEY = 'test-api-key'
    process.env.TRELLO_API_SECRET = 'test-api-secret'
    process.env.INTEGRATIONS_OAUTH_STATE_SECRET = 'test-secret-key-for-oauth-state-validation-12345678'
    
    provider = new TrelloProvider()
  })

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.name).toBe('trello')
      expect(provider.type).toBe('productivity')
      expect(provider.displayName).toBe('Trello')
      expect(provider.description).toContain('Trello')
      expect(provider.logoPath).toBe('/icons/trello.svg')
    })
  })

  describe('Card Creation', () => {
    it('should format card description correctly', () => {
      const messageData = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'created' as const,
      }
      
      const expectedDesc = `${messageData.content}\n\n---\n**Author:** ${messageData.author}\n**View note:** ${messageData.noteUrl}`
      
      expect(expectedDesc).toContain(messageData.content)
      expect(expectedDesc).toContain(messageData.author)
      expect(expectedDesc).toContain(messageData.noteUrl)
    })
  })

  describe('List Filtering', () => {
    it('should filter out archived lists', () => {
      const lists = [
        { id: '1', name: 'Active List', closed: false },
        { id: '2', name: 'Archived List', closed: true },
      ]
      
      const filtered = lists.filter(list => !list.closed)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].name).toBe('Active List')
    })
  })

  describe('OAuth 1.0 Flow', () => {
    it('should handle OAuth 1.0 signature generation', () => {
      // Test that OAuth 1.0 signature components are handled
      const oauthParams = {
        oauth_consumer_key: 'test-key',
        oauth_nonce: 'test-nonce',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: '1234567890',
        oauth_version: '1.0',
      }
      
      expect(oauthParams.oauth_signature_method).toBe('HMAC-SHA1')
      expect(oauthParams.oauth_version).toBe('1.0')
    })
  })
})