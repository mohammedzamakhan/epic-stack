/**
 * Tests for NoteHooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  noteHooks, 
  NoteHooks, 
  triggerNoteCreated, 
  triggerNoteUpdated, 
  triggerNoteDeleted,
  NoteOperationWrapper 
} from '../../src/note-hooks'
import { noteEventHandler } from '../../src/note-event-handler'
import { prisma } from '@repo/prisma'

// Mock dependencies
vi.mock('@repo/prisma', () => ({
  prisma: {
    organizationNote: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('../../src/note-event-handler', () => ({
  noteEventHandler: {
    handleNoteCreated: vi.fn(),
    handleNoteUpdated: vi.fn(),
    handleNoteDeleted: vi.fn(),
  },
}))

// Mock setImmediate for testing
global.setImmediate = vi.fn((callback) => {
  // Execute callback synchronously for testing
  Promise.resolve().then(callback)
})

describe('NoteHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NoteHooks.getInstance()
      const instance2 = NoteHooks.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as exported noteHooks', () => {
      const instance = NoteHooks.getInstance()
      expect(instance).toBe(noteHooks)
    })
  })

  describe('afterNoteCreated', () => {
    it('should trigger note created event successfully', async () => {
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await noteHooks.afterNoteCreated('note-123', 'user-123')

      // Wait for the async callback to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(setImmediate).toHaveBeenCalled()
      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-123', 'user-123')
      expect(consoleSpy).toHaveBeenCalledWith('Note creation notified 1 connections')

      consoleSpy.mockRestore()
    })

    it('should handle failed note creation event', async () => {
      const mockResult = { success: false, connectionsNotified: 0, errors: ['Test error'] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await noteHooks.afterNoteCreated('note-123', 'user-123')

      // Wait for the async callback to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('Note creation notification failed:', ['Test error'])

      consoleSpy.mockRestore()
    })

    it('should handle no connections notified', async () => {
      const mockResult = { success: true, connectionsNotified: 0, errors: [] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await noteHooks.afterNoteCreated('note-123', 'user-123')

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle errors in hook setup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock setImmediate to throw an error
      vi.mocked(setImmediate).mockImplementation(() => {
        throw new Error('Setup error')
      })

      await noteHooks.afterNoteCreated('note-123', 'user-123')

      expect(consoleSpy).toHaveBeenCalledWith('Error setting up afterNoteCreated hook:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should handle errors in async callback', async () => {
      vi.mocked(noteEventHandler.handleNoteCreated).mockRejectedValue(new Error('Async error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await noteHooks.afterNoteCreated('note-123', 'user-123')

      // Wait for the async callback to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith('Error in afterNoteCreated hook:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('afterNoteUpdated', () => {
    it('should trigger note updated event successfully', async () => {
      const mockResult = { success: true, connectionsNotified: 2, errors: [] }
      const previousData = { title: 'Old Title', content: 'Old Content' }
      
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await noteHooks.afterNoteUpdated('note-123', 'user-123', previousData)

      // Wait for the async callback to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-123', 'user-123', previousData)
      expect(consoleSpy).toHaveBeenCalledWith('Note update notified 2 connections')

      consoleSpy.mockRestore()
    })

    it('should handle note updated without previous data', async () => {
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)

      await noteHooks.afterNoteUpdated('note-123', 'user-123')

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-123', 'user-123', undefined)
    })

    it('should handle errors in hook setup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      vi.mocked(setImmediate).mockImplementation(() => {
        throw new Error('Setup error')
      })

      await noteHooks.afterNoteUpdated('note-123', 'user-123')

      expect(consoleSpy).toHaveBeenCalledWith('Error setting up afterNoteUpdated hook:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('beforeNoteDeleted', () => {
    it('should trigger note deleted event successfully', async () => {
      const mockNote = {
        id: 'note-123',
        title: 'Test Note',
        organizationId: 'org-123',
      }
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)
      vi.mocked(noteEventHandler.handleNoteDeleted).mockResolvedValue(mockResult)

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await noteHooks.beforeNoteDeleted('note-123', 'user-123')

      // Wait for the async callback to complete
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(prisma.organizationNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        select: {
          id: true,
          title: true,
          organizationId: true,
        },
      })
      expect(noteEventHandler.handleNoteDeleted).toHaveBeenCalledWith(
        'note-123',
        'user-123',
        { title: 'Test Note', organizationId: 'org-123' }
      )
      expect(consoleSpy).toHaveBeenCalledWith('Note deletion notified 1 connections')

      consoleSpy.mockRestore()
    })

    it('should handle note not found', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await noteHooks.beforeNoteDeleted('note-123', 'user-123')

      expect(consoleSpy).toHaveBeenCalledWith('Note not found for deletion hook:', 'note-123')
      expect(noteEventHandler.handleNoteDeleted).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockRejectedValue(new Error('Database error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await noteHooks.beforeNoteDeleted('note-123', 'user-123')

      expect(consoleSpy).toHaveBeenCalledWith('Error setting up beforeNoteDeleted hook:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Enhanced hooks', () => {
    it('should handle onNoteCreated', async () => {
      const noteData = {
        id: 'note-123',
        title: 'Test Note',
        content: 'Test Content',
        organizationId: 'org-123',
      }

      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)

      await noteHooks.onNoteCreated(noteData, 'user-123')

      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-123', 'user-123')
    })

    it('should handle onNoteUpdated with snapshots', async () => {
      const beforeSnapshot = {
        id: 'note-123',
        title: 'Old Title',
        content: 'Old Content',
        organizationId: 'org-123',
      }
      const afterSnapshot = {
        id: 'note-123',
        title: 'New Title',
        content: 'New Content',
        organizationId: 'org-123',
      }

      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)

      await noteHooks.onNoteUpdated('note-123', 'user-123', beforeSnapshot, afterSnapshot)

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith(
        'note-123',
        'user-123',
        { title: 'Old Title', content: 'Old Content' }
      )
    })

    it('should handle onNoteDeleted', async () => {
      const noteData = {
        id: 'note-123',
        title: 'Test Note',
        content: 'Test Content',
        organizationId: 'org-123',
      }

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(noteData)
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteDeleted).mockResolvedValue(mockResult)

      await noteHooks.onNoteDeleted(noteData, 'user-123')

      expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
    })
  })

  describe('captureNoteSnapshot', () => {
    it('should capture note snapshot successfully', async () => {
      const mockNote = {
        id: 'note-123',
        title: 'Test Note',
        content: 'Test Content',
        organizationId: 'org-123',
      }

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)

      const snapshot = await noteHooks.captureNoteSnapshot('note-123')

      expect(snapshot).toEqual(mockNote)
      expect(prisma.organizationNote.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        select: {
          id: true,
          title: true,
          content: true,
          organizationId: true,
        },
      })
    })

    it('should handle note not found', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const snapshot = await noteHooks.captureNoteSnapshot('note-123')

      expect(snapshot).toBeNull()
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.organizationNote.findUnique).mockRejectedValue(new Error('Database error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const snapshot = await noteHooks.captureNoteSnapshot('note-123')

      expect(snapshot).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Error capturing note snapshot:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('processBatchChanges', () => {
    it('should process batch changes successfully', async () => {
      const changes = [
        {
          type: 'created' as const,
          noteId: 'note-1',
          userId: 'user-123',
          afterSnapshot: {
            id: 'note-1',
            title: 'Note 1',
            content: 'Content 1',
            organizationId: 'org-123',
          },
        },
        {
          type: 'updated' as const,
          noteId: 'note-2',
          userId: 'user-123',
          beforeSnapshot: {
            id: 'note-2',
            title: 'Old Title',
            content: 'Old Content',
            organizationId: 'org-123',
          },
          afterSnapshot: {
            id: 'note-2',
            title: 'New Title',
            content: 'New Content',
            organizationId: 'org-123',
          },
        },
        {
          type: 'deleted' as const,
          noteId: 'note-3',
          userId: 'user-123',
          beforeSnapshot: {
            id: 'note-3',
            title: 'Deleted Note',
            content: 'Deleted Content',
            organizationId: 'org-123',
          },
        },
      ]

      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue({
        id: 'note-3',
        title: 'Deleted Note',
        organizationId: 'org-123',
      })
      vi.mocked(noteEventHandler.handleNoteDeleted).mockResolvedValue(mockResult)

      await noteHooks.processBatchChanges(changes)

      expect(setImmediate).toHaveBeenCalled()
    })

    it('should handle errors in batch processing setup', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      vi.mocked(setImmediate).mockImplementation(() => {
        throw new Error('Batch setup error')
      })

      await noteHooks.processBatchChanges([])

      expect(consoleSpy).toHaveBeenCalledWith('Error setting up batch change processing:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('Convenience functions', () => {
    it('should call triggerNoteCreated', async () => {
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)

      await triggerNoteCreated('note-123', 'user-123')

      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-123', 'user-123')
    })

    it('should call triggerNoteUpdated', async () => {
      const previousData = { title: 'Old Title', content: 'Old Content' }
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)

      await triggerNoteUpdated('note-123', 'user-123', previousData)

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-123', 'user-123', previousData)
    })

    it('should call triggerNoteDeleted', async () => {
      const mockNote = {
        id: 'note-123',
        title: 'Test Note',
        organizationId: 'org-123',
      }
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)

      await triggerNoteDeleted('note-123', 'user-123')

      expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
    })
  })

  describe('NoteOperationWrapper', () => {
    it('should wrap create operation', async () => {
      const operation = vi.fn().mockResolvedValue('result')
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue(mockResult)

      const result = await NoteOperationWrapper.create(operation, 'note-123', 'user-123')

      expect(operation).toHaveBeenCalled()
      expect(result).toBe('result')
      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-123', 'user-123')
    })

    it('should wrap update operation with snapshot', async () => {
      const operation = vi.fn().mockResolvedValue('result')
      const mockSnapshot = {
        id: 'note-123',
        title: 'Old Title',
        content: 'Old Content',
        organizationId: 'org-123',
      }
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockSnapshot)
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)

      const result = await NoteOperationWrapper.update(operation, 'note-123', 'user-123', true)

      expect(operation).toHaveBeenCalled()
      expect(result).toBe('result')
      expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith(
        'note-123',
        'user-123',
        { title: 'Old Title', content: 'Old Content' }
      )
    })

    it('should wrap update operation without snapshot', async () => {
      const operation = vi.fn().mockResolvedValue('result')
      const mockResult = { success: true, connectionsNotified: 1, errors: [] }
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue(mockResult)

      const result = await NoteOperationWrapper.update(operation, 'note-123', 'user-123', false)

      expect(operation).toHaveBeenCalled()
      expect(result).toBe('result')
      expect(prisma.organizationNote.findUnique).not.toHaveBeenCalled()
      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-123', 'user-123', undefined)
    })

    it('should wrap delete operation', async () => {
      const operation = vi.fn().mockResolvedValue('result')
      const mockNote = {
        id: 'note-123',
        title: 'Test Note',
        organizationId: 'org-123',
      }
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote)

      const result = await NoteOperationWrapper.delete(operation, 'note-123', 'user-123')

      expect(operation).toHaveBeenCalled()
      expect(result).toBe('result')
      expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
    })
  })
})