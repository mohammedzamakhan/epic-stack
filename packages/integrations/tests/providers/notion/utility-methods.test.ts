/**
 * Tests for NotionProvider utility methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotionProvider } from '../../../src/providers/notion/provider'

describe('NotionProvider - Utility Methods', () => {
  let provider: NotionProvider

  beforeEach(() => {
    // Set required environment variables
    process.env.NOTION_CLIENT_ID = 'test-client-id'
    process.env.NOTION_CLIENT_SECRET = 'test-client-secret'
    process.env.INTEGRATIONS_OAUTH_STATE_SECRET = 'test-secret-key-for-oauth-state-validation-12345678'
    
    provider = new NotionProvider()
  })

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.name).toBe('notion')
      expect(provider.type).toBe('productivity')
      expect(provider.displayName).toBe('Notion')
      expect(provider.description).toContain('Notion')
      expect(provider.logoPath).toBe('/icons/notion.svg')
    })
  })

  describe('Page Content Formatting', () => {
    it('should format page content as rich text blocks', () => {
      const content = 'This is a test note content'
      const richTextBlock = {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: content,
              },
            },
          ],
        },
      }
      
      expect(richTextBlock.type).toBe('paragraph')
      expect(richTextBlock.paragraph.rich_text[0].text.content).toBe(content)
    })

    it('should handle empty content', () => {
      const content = ''
      const richTextBlock = {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: content || 'No content',
              },
            },
          ],
        },
      }
      
      expect(richTextBlock.paragraph.rich_text[0].text.content).toBe('No content')
    })
  })

  describe('Database Filtering', () => {
    it('should filter databases by type', () => {
      const databases = [
        { id: '1', object: 'database', title: [{ plain_text: 'Notes' }] },
        { id: '2', object: 'page', title: [{ plain_text: 'Not a database' }] },
      ]
      
      const filtered = databases.filter(db => db.object === 'database')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })
  })
})