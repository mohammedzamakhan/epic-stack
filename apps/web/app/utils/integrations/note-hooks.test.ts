/**
 * Tests for Note Hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NoteHooks, noteHooks, triggerNoteCreated, triggerNoteUpdated, triggerNoteDeleted, NoteOperationWrapper } from './note-hooks'

// Mock dependencies
vi.mock('../db.server', () => ({
  prisma: {
    organizationNote: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('./note-event-handler', () => ({
  noteEventHandler: {
    handleNoteCreated: vi.fn(),
    handleNoteUpdated: vi.fn(),
    handleNoteDeleted: vi.fn(),
  },
}))

// Mock setImmediate to make tests synchronous
vi.mock('timers', () => ({
  setImmediate: vi.fn((fn) => fn()),
}))

describe('NoteHooks', () => {
  let hooks: NoteHooks

  beforeEach(() => {
    hooks = NoteHooks.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('afterNoteCreated', () => {
    it('should trigger note creation handler', async () => {
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      await hooks.afterNoteCreated('note-1', 'user-1')

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-1', 'user-1')
    })

    it('should handle errors gracefully', async () => {
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteCreated).mockRejectedValue(new Error('Test error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await hooks.afterNoteCreated('note-1', 'user-1')

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('afterNoteUpdated', () => {
    it('should trigger note update handler with previous data', async () => {
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      const previousData = { title: 'Old Title', content: 'Old content' }

      await hooks.afterNoteUpdated('note-1', 'user-1', previousData)

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-1', 'user-1', previousData)
    })

    it('should trigger note update handler without previous data', async () => {
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue({
        success: true,
        connectionsNotified: 0,
        errors: []
      })

      await hooks.afterNoteUpdated('note-1', 'user-1')

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-1', 'user-1', undefined)
    })
  })

  describe('beforeNoteDeleted', () => {
    it('should trigger note deletion handler', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        organizationId: 'org-1'
      }

      const { prisma } = await import('../db.server')
      const { noteEventHandler } = await import('./note-event-handler')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(noteEventHandler.handleNoteDeleted).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      await hooks.beforeNoteDeleted('note-1', 'user-1')

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteDeleted).toHaveBeenCalledWith(
        'note-1',
        'user-1',
        { title: 'Test Note', organizationId: 'org-1' }
      )
    })

    it('should handle note not found', async () => {
      const { prisma } = await import('../db.server')
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await hooks.beforeNoteDeleted('note-1', 'user-1')

      expect(consoleSpy).toHaveBeenCalledWith('Note not found for deletion hook:', 'note-1')
      consoleSpy.mockRestore()
    })
  })

  describe('captureNoteSnapshot', () => {
    it('should capture note snapshot', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Test content',
        organizationId: 'org-1'
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)

      const snapshot = await hooks.captureNoteSnapshot('note-1')

      expect(snapshot).toEqual(mockNote)
    })

    it('should return null if note not found', async () => {
      const { prisma } = await import('../db.server')
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

      const snapshot = await hooks.captureNoteSnapshot('note-1')

      expect(snapshot).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      const { prisma } = await import('../db.server')
      vi.mocked(prisma.organizationNote.findUnique).mockRejectedValue(new Error('Database error'))

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const snapshot = await hooks.captureNoteSnapshot('note-1')

      expect(snapshot).toBeNull()
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('processBatchChanges', () => {
    it('should process batch changes', async () => {
      const changes = [
        {
          type: 'created' as const,
          noteId: 'note-1',
          userId: 'user-1',
          afterSnapshot: {
            id: 'note-1',
            title: 'New Note',
            content: 'New content',
            organizationId: 'org-1'
          }
        },
        {
          type: 'updated' as const,
          noteId: 'note-2',
          userId: 'user-1',
          beforeSnapshot: {
            id: 'note-2',
            title: 'Old Title',
            content: 'Old content',
            organizationId: 'org-1'
          },
          afterSnapshot: {
            id: 'note-2',
            title: 'New Title',
            content: 'New content',
            organizationId: 'org-1'
          }
        }
      ]

      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      await hooks.processBatchChanges(changes)

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-1', 'user-1')
      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith(
        'note-2',
        'user-1',
        { title: 'Old Title', content: 'Old content' }
      )
    })
  })

  describe('convenience functions', () => {
    it('should call triggerNoteCreated', async () => {
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      await triggerNoteCreated('note-1', 'user-1')

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-1', 'user-1')
    })

    it('should call triggerNoteUpdated', async () => {
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      const previousData = { title: 'Old Title', content: 'Old content' }
      await triggerNoteUpdated('note-1', 'user-1', previousData)

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith('note-1', 'user-1', previousData)
    })

    it('should call triggerNoteDeleted', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        organizationId: 'org-1'
      }

      const { prisma } = await import('../db.server')
      const { noteEventHandler } = await import('./note-event-handler')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(noteEventHandler.handleNoteDeleted).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      await triggerNoteDeleted('note-1', 'user-1')

      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(noteEventHandler.handleNoteDeleted).toHaveBeenCalledWith(
        'note-1',
        'user-1',
        { title: 'Test Note', organizationId: 'org-1' }
      )
    })
  })

  describe('NoteOperationWrapper', () => {
    it('should wrap create operation', async () => {
      const mockOperation = vi.fn().mockResolvedValue('result')
      const { noteEventHandler } = await import('./note-event-handler')
      vi.mocked(noteEventHandler.handleNoteCreated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      const result = await NoteOperationWrapper.create(mockOperation, 'note-1', 'user-1')

      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalled()
      
      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(noteEventHandler.handleNoteCreated).toHaveBeenCalledWith('note-1', 'user-1')
    })

    it('should wrap update operation with snapshot', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Old Title',
        content: 'Old content',
        organizationId: 'org-1'
      }

      const mockOperation = vi.fn().mockResolvedValue('result')
      const { prisma } = await import('../db.server')
      const { noteEventHandler } = await import('./note-event-handler')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(noteEventHandler.handleNoteUpdated).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      const result = await NoteOperationWrapper.update(mockOperation, 'note-1', 'user-1', true)

      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalled()
      
      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(noteEventHandler.handleNoteUpdated).toHaveBeenCalledWith(
        'note-1',
        'user-1',
        { title: 'Old Title', content: 'Old content' }
      )
    })

    it('should wrap delete operation', async () => {
      const mockNote = {
        id: 'note-1',
        title: 'Test Note',
        organizationId: 'org-1'
      }

      const mockOperation = vi.fn().mockResolvedValue('result')
      const { prisma } = await import('../db.server')
      const { noteEventHandler } = await import('./note-event-handler')

      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(noteEventHandler.handleNoteDeleted).mockResolvedValue({
        success: true,
        connectionsNotified: 1,
        errors: []
      })

      const result = await NoteOperationWrapper.delete(mockOperation, 'note-1', 'user-1')

      expect(result).toBe('result')
      expect(mockOperation).toHaveBeenCalled()
      
      // Wait for setImmediate to execute
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(noteEventHandler.handleNoteDeleted).toHaveBeenCalledWith(
        'note-1',
        'user-1',
        { title: 'Test Note', organizationId: 'org-1' }
      )
    })
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = NoteHooks.getInstance()
      const instance2 = NoteHooks.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(noteHooks)
    })
  })
})