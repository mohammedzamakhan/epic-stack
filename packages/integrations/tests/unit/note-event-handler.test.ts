/**
 * Tests for NoteEventHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { noteEventHandler, NoteEventHandler, type NoteChangeEvent } from '../../src/note-event-handler'
import { integrationManager } from '../../src/integration-manager'
import { prisma } from '@repo/prisma'

// Mock dependencies
vi.mock('@repo/prisma', () => ({
  prisma: {
    organizationNote: {
      findUnique: vi.fn(),
    },
    noteIntegrationConnection: {
      findMany: vi.fn(),
    },
    integrationLog: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../src/integration-manager', () => ({
  integrationManager: {
    getOrganizationIntegrations: vi.fn(),
    getNoteConnections: vi.fn(),
    handleNoteUpdate: vi.fn(),
  },
}))

describe('NoteEventHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NoteEventHandler.getInstance()
      const instance2 = NoteEventHandler.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as exported noteEventHandler', () => {
      const instance = NoteEventHandler.getInstance()
      expect(instance).toBe(noteEventHandler)
    })
  })

  describe('handleNoteCreated', () => {
    it('should handle note creation successfully', async () => {
      const mockNote = {
        id: 'note-123',
        organizationId: 'org-123',
        title: 'Test Note',
        content: 'Test content',
      }

      const mockIntegrations = [{ id: 'int-123', providerName: 'slack' }]
      const mockConnections = [{ id: 'conn-123', channelId: 'channel-123' }]

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(mockIntegrations as any)
      vi.mocked(integrationManager.getNoteConnections).mockResolvedValue(mockConnections as any)
      vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue()

      const result = await noteEventHandler.handleNoteCreated('note-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(1)
      expect(result.errors).toEqual([])
      expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith('note-123', 'created', 'user-123')
    })

    it('should handle note not found', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const result = await noteEventHandler.handleNoteCreated('note-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toEqual(['Note not found'])
    })

    it('should handle no integrations', async () => {
      const mockNote = {
        id: 'note-123',
        organizationId: 'org-123',
        title: 'Test Note',
        content: 'Test content',
      }

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const result = await noteEventHandler.handleNoteCreated('note-123', 'user-123')

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockRejectedValue(new Error('Database error'))

      const result = await noteEventHandler.handleNoteCreated('note-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toEqual(['Database error'])
    })
  })

  describe('handleNoteUpdated', () => {
    it('should handle note update successfully', async () => {
      const mockNote = {
        id: 'note-123',
        organizationId: 'org-123',
        title: 'Updated Note',
        content: 'Updated content',
      }

      const previousData = {
        title: 'Original Note',
        content: 'Original content',
      }

      const mockIntegrations = [{ id: 'int-123', providerName: 'slack' }]
      const mockConnections = [{ id: 'conn-123', channelId: 'channel-123' }]

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(mockIntegrations as any)
      vi.mocked(integrationManager.getNoteConnections).mockResolvedValue(mockConnections as any)
      vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue()

      const result = await noteEventHandler.handleNoteUpdated('note-123', 'user-123', previousData)

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(1)
      expect(result.errors).toEqual([])
      expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith('note-123', 'updated', 'user-123')
    })

    it('should detect changes when previous data is provided', async () => {
      const mockNote = {
        id: 'note-123',
        organizationId: 'org-123',
        title: 'Updated Note',
        content: 'Original content',
      }

      const previousData = {
        title: 'Original Note',
        content: 'Original content',
      }

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const result = await noteEventHandler.handleNoteUpdated('note-123', 'user-123', previousData)

      expect(result.success).toBe(true)
    })

    it('should handle note not found', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const result = await noteEventHandler.handleNoteUpdated('note-123', 'user-123')

      expect(result.success).toBe(false)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toEqual(['Note not found'])
    })
  })

  describe('handleNoteDeleted', () => {
    it('should handle note deletion successfully', async () => {
      const noteData = {
        title: 'Deleted Note',
        organizationId: 'org-123',
      }

      const mockIntegrations = [{ id: 'int-123', providerName: 'slack' }]
      const mockConnections = [{ id: 'conn-123', channelId: 'channel-123', integration: {} }]

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(mockIntegrations as any)
      vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(mockConnections as any)
      vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue()

      const result = await noteEventHandler.handleNoteDeleted('note-123', 'user-123', noteData)

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(1)
      expect(result.errors).toEqual([])
      expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith('note-123', 'deleted', 'user-123')
    })

    it('should handle no connections for deleted note', async () => {
      const noteData = {
        title: 'Deleted Note',
        organizationId: 'org-123',
      }

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([{ id: 'int-123' }] as any)
      vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue([])

      const result = await noteEventHandler.handleNoteDeleted('note-123', 'user-123', noteData)

      expect(result.success).toBe(true)
      expect(result.connectionsNotified).toBe(0)
      expect(result.errors).toEqual([])
    })
  })

  describe('processBatchEvents', () => {
    it('should process multiple events successfully', async () => {
      const events: NoteChangeEvent[] = [
        {
          noteId: 'note-1',
          changeType: 'created',
          userId: 'user-123',
          organizationId: 'org-123',
          timestamp: new Date(),
        },
        {
          noteId: 'note-2',
          changeType: 'updated',
          userId: 'user-123',
          organizationId: 'org-123',
          timestamp: new Date(),
        },
      ]

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const results = await noteEventHandler.processBatchEvents(events)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should handle errors in batch processing', async () => {
      const events: NoteChangeEvent[] = [
        {
          noteId: 'note-1',
          changeType: 'created',
          userId: 'user-123',
          organizationId: 'org-123',
          timestamp: new Date(),
        },
      ]

      vi.mocked(integrationManager.getOrganizationIntegrations).mockRejectedValue(new Error('Batch error'))

      const results = await noteEventHandler.processBatchEvents(events)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].errors).toEqual(['Batch error'])
    })
  })

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      const mockIntegrations = [{ id: 'int-123' }]
      const mockLogs = [
        {
          status: 'success',
          requestData: JSON.stringify({ noteId: 'note-1', channelId: 'channel-1' }),
        },
        {
          status: 'error',
          requestData: JSON.stringify({ noteId: 'note-2', channelId: 'channel-2' }),
        },
        {
          status: 'success',
          requestData: JSON.stringify({ noteId: 'note-1', channelId: 'channel-1' }),
        },
      ]

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(mockIntegrations as any)
      vi.mocked(prisma.integrationLog.findMany).mockResolvedValue(mockLogs as any)

      const stats = await noteEventHandler.getEventStats('org-123', 24)

      expect(stats.totalEvents).toBe(3)
      expect(stats.successfulEvents).toBe(2)
      expect(stats.failedEvents).toBe(1)
      expect(stats.connectionsNotified).toBe(2) // Unique connections
    })

    it('should handle no integrations', async () => {
      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue([])

      const stats = await noteEventHandler.getEventStats('org-123')

      expect(stats.totalEvents).toBe(0)
      expect(stats.successfulEvents).toBe(0)
      expect(stats.failedEvents).toBe(0)
      expect(stats.connectionsNotified).toBe(0)
    })

    it('should handle invalid request data', async () => {
      const mockIntegrations = [{ id: 'int-123' }]
      const mockLogs = [
        {
          status: 'success',
          requestData: 'invalid-json',
        },
        {
          status: 'success',
          requestData: null,
        },
      ]

      vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(mockIntegrations as any)
      vi.mocked(prisma.integrationLog.findMany).mockResolvedValue(mockLogs as any)

      const stats = await noteEventHandler.getEventStats('org-123')

      expect(stats.totalEvents).toBe(2)
      expect(stats.connectionsNotified).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      vi.mocked(integrationManager.getOrganizationIntegrations).mockRejectedValue(new Error('Stats error'))

      const stats = await noteEventHandler.getEventStats('org-123')

      expect(stats.totalEvents).toBe(0)
      expect(stats.successfulEvents).toBe(0)
      expect(stats.failedEvents).toBe(0)
      expect(stats.connectionsNotified).toBe(0)
    })
  })
})