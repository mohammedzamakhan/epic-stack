/**
 * Tests for Note Event Handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NoteEventHandler, noteEventHandler } from './note-event-handler'

// Mock dependencies
vi.mock('../db.server', () => ({
  prisma: {
    organizationNote: {
      findUnique: vi.fn(),
    },
    noteIntegrationConnection: {
      findMany: vi.fn(),
    },
    integrationLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('./integration-manager', () => ({
  integrationManager: {
    getOrganizationIntegrations: vi.fn(),
    getNoteConnections: vi.fn(),
    handleNoteUpdate: vi.fn(),
  },
}))

describe('NoteEventHandler', () => {
  let handler: NoteEventHandler

  beforeEach(() => {
    handler = NoteEventHandler.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleNoteCreated', () => {
    it('should handle note creation successfully', async () => {
      const mockNote = {
        id: 'note-1',
        organizationId: 'org-1',
        title: 'Test Note',
        content: 'Test content'
      }

      const mockConnections = [
        { id: 'conn-1', integrationId: 'int-1' }
      ]

      const { prisma } = await import('../db.server')
      const { integrationManager } = await import('./integration-manager')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([{ id: 'int-1' }] as any)
      vi.mocked(integrationManager.getNoteConnections).mockResolvedValue(mockConnections as any)
      vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue(undefined)

      const result = await handler.handleNoteCreated('note-1', 'user-1')

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith('note-1', 'created', 'user-1')
    })

    it('should handle note not found', async () => {
      const { prisma } = await import('../db.server')
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const result = await handler.handleNoteCreated('note-1', 'user-1')

      expect(result.success).toBe(false)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toContain('Note not found')
    })

    it('should handle no integrations gracefully', async () => {
      const mockNote = {
        id: 'note-1',
        organizationId: 'org-1',
        title: 'Test Note',
        content: 'Test content'
      }

      const { prisma } = await import('../db.server')
      const { integrationManager } = await import('./integration-manager')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const result = await handler.handleNoteCreated('note-1', 'user-1')

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('handleNoteUpdated', () => {
    it('should handle note update with change detection', async () => {
      const mockNote = {
        id: 'note-1',
        organizationId: 'org-1',
        title: 'Updated Title',
        content: 'Updated content'
      }

      const previousData = {
        title: 'Original Title',
        content: 'Original content'
      }

      const mockConnections = [
        { id: 'conn-1', integrationId: 'int-1' }
      ]

      const { prisma } = await import('../db.server')
      const { integrationManager } = await import('./integration-manager')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([{ id: 'int-1' }] as any)
      vi.mocked(integrationManager.getNoteConnections).mockResolvedValue(mockConnections as any)
      vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue(undefined)

      const result = await handler.handleNoteUpdated('note-1', 'user-1', previousData)

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(1)
      expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith('note-1', 'updated', 'user-1')
    })

    it('should handle update without previous data', async () => {
      const mockNote = {
        id: 'note-1',
        organizationId: 'org-1',
        title: 'Test Note',
        content: 'Test content'
      }

      const { prisma } = await import('../db.server')
      const { integrationManager } = await import('./integration-manager')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([{ id: 'int-1' }] as any)
      vi.mocked(integrationManager.getNoteConnections).mockResolvedValue([])

      const result = await handler.handleNoteUpdated('note-1', 'user-1')

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(0)
    })
  })

  describe('handleNoteDeleted', () => {
    it('should handle note deletion', async () => {
      const noteData = {
        title: 'Deleted Note',
        organizationId: 'org-1'
      }

      const mockConnections = [
        { id: 'conn-1', integrationId: 'int-1', integration: { id: 'int-1' } }
      ]

      const { prisma } = await import('../db.server')
      const { integrationManager } = await import('./integration-manager')

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([{ id: 'int-1' }] as any)
      vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(mockConnections as any)
      vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue(undefined)

      const result = await handler.handleNoteDeleted('note-1', 'user-1', noteData)

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(1)
      expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith('note-1', 'deleted', 'user-1')
    })
  })

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      const mockIntegrations = [
        { id: 'int-1' },
        { id: 'int-2' }
      ]

      const mockLogs = [
        { status: 'success', requestData: '{"noteId":"note-1","channelId":"ch-1"}' },
        { status: 'success', requestData: '{"noteId":"note-2","channelId":"ch-1"}' },
        { status: 'error', requestData: '{"noteId":"note-3","channelId":"ch-2"}' }
      ]

      const { prisma } = await import('../db.server')
      const { integrationManager } = await import('./integration-manager')

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(mockIntegrations as any)
      vi.mocked(prisma.integrationLog.findMany).mockResolvedValue(mockLogs as any)
      vi.mocked(prisma.integrationLog.count).mockResolvedValue(1)
      vi.mocked(prisma.integrationLog.findFirst).mockResolvedValue({ createdAt: new Date() } as any)

      const stats = await handler.getEventStats('org-1')

      expect(stats.totalEvents).toBe(3)
      expect(stats.successfulEvents).toBe(2)
      expect(stats.failedEvents).toBe(1)
      expect(stats.connectionsNotified).toBe(2) // Unique connections
    })

    it('should handle organization with no integrations', async () => {
      const { integrationManager } = await import('./integration-manager')
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const stats = await handler.getEventStats('org-1')

      expect(stats.totalEvents).toBe(0)
      expect(stats.successfulEvents).toBe(0)
      expect(stats.failedEvents).toBe(0)
      expect(stats.connectionsNotified).toBe(0)
    })
  })

  describe('processBatchEvents', () => {
    it('should process multiple events', async () => {
      const events = [
        {
          noteId: 'note-1',
          changeType: 'created' as const,
          userId: 'user-1',
          organizationId: 'org-1',
          timestamp: new Date()
        },
        {
          noteId: 'note-2',
          changeType: 'updated' as const,
          userId: 'user-1',
          organizationId: 'org-1',
          timestamp: new Date()
        }
      ]

      const { integrationManager } = await import('./integration-manager')
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const results = await handler.processBatchEvents(events)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NoteEventHandler.getInstance()
      const instance2 = NoteEventHandler.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(noteEventHandler)
    })
  })
})