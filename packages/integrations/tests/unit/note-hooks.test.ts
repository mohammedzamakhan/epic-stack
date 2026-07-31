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
	NoteOperationWrapper,
} from '../../src/note-hooks'
import { noteNotifier } from '../../src/note-notifier'
import { prisma } from '@repo/database'

// Mock dependencies
vi.mock('@repo/database', () => ({
	prisma: {
		organizationNote: {
			findUnique: vi.fn(),
		},
	},
}))

vi.mock('../../src/note-notifier', () => ({
	noteNotifier: {
		notify: vi.fn(),
	},
}))

// Mock setImmediate for testing - store callbacks to manually flush them
const pendingCallbacks: Array<() => Promise<void>> = []

const setImmediateImpl = (
	callback: (...args: any[]) => void,
	...args: any[]
) => {
	const asyncCallback = async () => {
		try {
			await callback(...args)
		} catch (error) {
			// Errors are logged in the implementation
		}
	}
	pendingCallbacks.push(asyncCallback)
	return {} as NodeJS.Immediate
}

const mockSetImmediate = vi.fn(setImmediateImpl)
global.setImmediate = setImmediateImpl as any

const flushCallbacks = async () => {
	while (pendingCallbacks.length > 0) {
		const callback = pendingCallbacks.shift()
		if (callback) {
			await callback()
		}
	}
}

describe('NoteHooks', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockSetImmediate.mock.calls = []
		pendingCallbacks.length = 0
		global.setImmediate = setImmediateImpl as any
	})

	afterEach(() => {
		vi.restoreAllMocks()
		global.setImmediate = setImmediateImpl as any
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
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

			await noteHooks.afterNoteCreated('note-123', 'user-123')
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'created',
				'user-123',
			)
			expect(consoleSpy).toHaveBeenCalledWith(
				'Note creation notified 1 connections',
			)

			consoleSpy.mockRestore()
		})

		it('should handle failed note creation event', async () => {
			const mockResult = {
				success: false,
				connectionsNotified: 0,
				errors: ['Test error'],
			}
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			await noteHooks.afterNoteCreated('note-123', 'user-123')
			await flushCallbacks()

			expect(consoleSpy).toHaveBeenCalledWith(
				'Note creation notification failed:',
				['Test error'],
			)

			consoleSpy.mockRestore()
		})

		it('should handle no connections notified', async () => {
			const mockResult = { success: true, connectionsNotified: 0, errors: [] }
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

			await noteHooks.afterNoteCreated('note-123', 'user-123')

			expect(consoleSpy).not.toHaveBeenCalled()

			consoleSpy.mockRestore()
		})

		it('should handle errors in hook setup', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			global.setImmediate = (() => {
				throw new Error('Setup error')
			}) as any

			await noteHooks.afterNoteCreated('note-123', 'user-123')

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error setting up afterNoteCreated hook:',
				expect.any(Error),
			)

			consoleSpy.mockRestore()
		})

		it('should handle errors in async callback', async () => {
			vi.mocked(noteNotifier.notify).mockRejectedValue(new Error('Async error'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			await noteHooks.afterNoteCreated('note-123', 'user-123')
			await flushCallbacks()

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error in afterNoteCreated hook:',
				expect.any(Error),
			)

			consoleSpy.mockRestore()
		})
	})

	describe('afterNoteUpdated', () => {
		it('should trigger note updated event successfully', async () => {
			const mockResult = { success: true, connectionsNotified: 2, errors: [] }
			const previousData = { title: 'Old Title', content: 'Old Content' }

			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

			await noteHooks.afterNoteUpdated('note-123', 'user-123', previousData)
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
			expect(consoleSpy).toHaveBeenCalledWith(
				'Note update notified 2 connections',
			)

			consoleSpy.mockRestore()
		})

		it('should handle note updated without previous data', async () => {
			const mockResult = { success: true, connectionsNotified: 1, errors: [] }

			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			await noteHooks.afterNoteUpdated('note-123', 'user-123')
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
		})

		it('should handle errors in hook setup', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			global.setImmediate = (() => {
				throw new Error('Setup error')
			}) as any

			await noteHooks.afterNoteUpdated('note-123', 'user-123')

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error setting up afterNoteUpdated hook:',
				expect.any(Error),
			)

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

			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockNote as any,
			)
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

			await noteHooks.beforeNoteDeleted('note-123', 'user-123')
			await flushCallbacks()

			expect(prisma.organizationNote.findUnique).toHaveBeenCalledWith({
				where: { id: 'note-123' },
				select: {
					id: true,
					title: true,
					content: true,
					organizationId: true,
				},
			})
			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'deleted',
				'user-123',
				mockNote,
			)
			expect(consoleSpy).toHaveBeenCalledWith(
				'Note deletion notified 1 connections',
			)

			consoleSpy.mockRestore()
		})

		it('should handle note not found', async () => {
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(null)

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			await noteHooks.beforeNoteDeleted('note-123', 'user-123')

			expect(consoleSpy).toHaveBeenCalledWith(
				'Note not found for deletion hook:',
				'note-123',
			)
			expect(noteNotifier.notify).not.toHaveBeenCalled()

			consoleSpy.mockRestore()
		})

		it('should handle database errors', async () => {
			vi.mocked(prisma.organizationNote.findUnique).mockRejectedValue(
				new Error('Database error'),
			)

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			await noteHooks.beforeNoteDeleted('note-123', 'user-123')

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error setting up beforeNoteDeleted hook:',
				expect.any(Error),
			)

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
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			await noteHooks.onNoteCreated(noteData, 'user-123')
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'created',
				'user-123',
			)
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
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			await noteHooks.onNoteUpdated(
				'note-123',
				'user-123',
				beforeSnapshot,
				afterSnapshot,
			)
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
		})

		it('should handle onNoteDeleted', async () => {
			const noteData = {
				id: 'note-123',
				title: 'Test Note',
				content: 'Test Content',
				organizationId: 'org-123',
			}

			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				noteData as any,
			)
			const mockResult = { success: true, connectionsNotified: 1, errors: [] }
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

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

			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockNote as any,
			)

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
			vi.mocked(prisma.organizationNote.findUnique).mockRejectedValue(
				new Error('Database error'),
			)

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const snapshot = await noteHooks.captureNoteSnapshot('note-123')

			expect(snapshot).toBeNull()
			expect(consoleSpy).toHaveBeenCalledWith(
				'Error capturing note snapshot:',
				expect.any(Error),
			)

			consoleSpy.mockRestore()
		})
	})

	describe('Convenience functions', () => {
		it('should call triggerNoteCreated', async () => {
			const mockResult = { success: true, connectionsNotified: 1, errors: [] }
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			await triggerNoteCreated('note-123', 'user-123')
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'created',
				'user-123',
			)
		})

		it('should call triggerNoteUpdated', async () => {
			const previousData = { title: 'Old Title', content: 'Old Content' }
			const mockResult = { success: true, connectionsNotified: 1, errors: [] }
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			await triggerNoteUpdated('note-123', 'user-123', previousData)
			await flushCallbacks()

			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
		})

		it('should call triggerNoteDeleted', async () => {
			const mockNote = {
				id: 'note-123',
				title: 'Test Note',
				organizationId: 'org-123',
			}
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockNote as any,
			)

			await triggerNoteDeleted('note-123', 'user-123')

			expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
		})
	})

	describe('NoteOperationWrapper', () => {
		it('should wrap create operation', async () => {
			const operation = vi.fn().mockResolvedValue('result')
			const mockResult = { success: true, connectionsNotified: 1, errors: [] }
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const result = await NoteOperationWrapper.create(
				operation,
				'note-123',
				'user-123',
			)
			await flushCallbacks()

			expect(operation).toHaveBeenCalled()
			expect(result).toBe('result')
			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'created',
				'user-123',
			)
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

			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockSnapshot as any,
			)
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const result = await NoteOperationWrapper.update(
				operation,
				'note-123',
				'user-123',
				true,
			)
			await flushCallbacks()

			expect(operation).toHaveBeenCalled()
			expect(result).toBe('result')
			expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
		})

		it('should wrap update operation without snapshot', async () => {
			const operation = vi.fn().mockResolvedValue('result')
			const mockResult = { success: true, connectionsNotified: 1, errors: [] }
			vi.mocked(noteNotifier.notify).mockResolvedValue(mockResult)

			const result = await NoteOperationWrapper.update(
				operation,
				'note-123',
				'user-123',
				false,
			)
			await flushCallbacks()

			expect(operation).toHaveBeenCalled()
			expect(result).toBe('result')
			expect(prisma.organizationNote.findUnique).not.toHaveBeenCalled()
			expect(noteNotifier.notify).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
		})

		it('should wrap delete operation', async () => {
			const operation = vi.fn().mockResolvedValue('result')
			const mockNote = {
				id: 'note-123',
				title: 'Test Note',
				organizationId: 'org-123',
			}
			vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(
				mockNote as any,
			)

			const result = await NoteOperationWrapper.delete(
				operation,
				'note-123',
				'user-123',
			)

			expect(operation).toHaveBeenCalled()
			expect(result).toBe('result')
			expect(prisma.organizationNote.findUnique).toHaveBeenCalled()
		})
	})
})
