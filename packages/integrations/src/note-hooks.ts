/**
 * Note Hooks - Middleware for automatically triggering integration notifications
 *
 * This module provides hooks and middleware that automatically detect note changes
 * and trigger integration notifications without requiring manual intervention.
 */

import { prisma } from '@repo/prisma'
import { noteEventHandler } from './note-event-handler'

/**
 * Note data for change detection
 */
interface NoteSnapshot {
	id: string
	title: string
	content: string
	organizationId: string
}

/**
 * Note Hooks class
 *
 * Provides middleware functions that can be called from route handlers
 * to automatically trigger integration notifications.
 */
export class NoteHooks {
	private static instance: NoteHooks

	/**
	 * Get singleton instance
	 */
	static getInstance(): NoteHooks {
		if (!NoteHooks.instance) {
			NoteHooks.instance = new NoteHooks()
		}
		return NoteHooks.instance
	}

	/**
	 * Hook to call after note creation
	 * @param noteId - ID of the created note
	 * @param userId - ID of the user who created the note
	 */
	async afterNoteCreated(noteId: string, userId: string): Promise<void> {
		try {
			// Trigger integration notifications asynchronously
			// Don't await to avoid blocking the main request
			setImmediate(async () => {
				try {
					const result = await noteEventHandler.handleNoteCreated(
						noteId,
						userId,
					)
					if (!result.success) {
						console.warn('Note creation notification failed:', result.errors)
					} else if (result.connectionsNotified > 0) {
						console.log(
							`Note creation notified ${result.connectionsNotified} connections`,
						)
					}
				} catch (error) {
					console.error('Error in afterNoteCreated hook:', error)
				}
			})
		} catch (error) {
			// Don't throw errors from hooks to avoid breaking the main flow
			console.error('Error setting up afterNoteCreated hook:', error)
		}
	}

	/**
	 * Hook to call after note update
	 * @param noteId - ID of the updated note
	 * @param userId - ID of the user who updated the note
	 * @param previousData - Previous note data for change detection
	 */
	async afterNoteUpdated(
		noteId: string,
		userId: string,
		previousData?: { title: string; content: string },
	): Promise<void> {
		try {
			// Trigger integration notifications asynchronously
			setImmediate(async () => {
				try {
					const result = await noteEventHandler.handleNoteUpdated(
						noteId,
						userId,
						previousData,
					)
					if (!result.success) {
						console.warn('Note update notification failed:', result.errors)
					} else if (result.connectionsNotified > 0) {
						console.log(
							`Note update notified ${result.connectionsNotified} connections`,
						)
					}
				} catch (error) {
					console.error('Error in afterNoteUpdated hook:', error)
				}
			})
		} catch (error) {
			console.error('Error setting up afterNoteUpdated hook:', error)
		}
	}

	/**
	 * Hook to call before note deletion
	 * @param noteId - ID of the note to be deleted
	 * @param userId - ID of the user who is deleting the note
	 */
	async beforeNoteDeleted(noteId: string, userId: string): Promise<void> {
		try {
			// Get note data before deletion
			const note = await prisma.organizationNote.findUnique({
				where: { id: noteId },
				select: {
					id: true,
					title: true,
					organizationId: true,
				},
			})

			if (!note) {
				console.warn('Note not found for deletion hook:', noteId)
				return
			}

			// Trigger integration notifications asynchronously
			setImmediate(async () => {
				try {
					const result = await noteEventHandler.handleNoteDeleted(
						noteId,
						userId,
						{ title: note.title, organizationId: note.organizationId },
					)
					if (!result.success) {
						console.warn('Note deletion notification failed:', result.errors)
					} else if (result.connectionsNotified > 0) {
						console.log(
							`Note deletion notified ${result.connectionsNotified} connections`,
						)
					}
				} catch (error) {
					console.error('Error in beforeNoteDeleted hook:', error)
				}
			})
		} catch (error) {
			console.error('Error setting up beforeNoteDeleted hook:', error)
		}
	}

	/**
	 * Enhanced note creation hook with change detection
	 * @param noteData - Complete note data after creation
	 * @param userId - ID of the user who created the note
	 */
	async onNoteCreated(noteData: NoteSnapshot, userId: string): Promise<void> {
		await this.afterNoteCreated(noteData.id, userId)
	}

	/**
	 * Enhanced note update hook with automatic change detection
	 * @param noteId - ID of the updated note
	 * @param userId - ID of the user who updated the note
	 * @param beforeSnapshot - Note data before update
	 * @param afterSnapshot - Note data after update
	 */
	async onNoteUpdated(
		noteId: string,
		userId: string,
		beforeSnapshot?: NoteSnapshot,
		_afterSnapshot?: NoteSnapshot,
	): Promise<void> {
		let previousData: { title: string; content: string } | undefined

		if (beforeSnapshot) {
			previousData = {
				title: beforeSnapshot.title,
				content: beforeSnapshot.content,
			}
		}

		await this.afterNoteUpdated(noteId, userId, previousData)
	}

	/**
	 * Enhanced note deletion hook
	 * @param noteData - Note data before deletion
	 * @param userId - ID of the user who deleted the note
	 */
	async onNoteDeleted(noteData: NoteSnapshot, userId: string): Promise<void> {
		await this.beforeNoteDeleted(noteData.id, userId)
	}

	/**
	 * Utility to capture note snapshot for change detection
	 * @param noteId - ID of the note to snapshot
	 * @returns Note snapshot or null if not found
	 */
	async captureNoteSnapshot(noteId: string): Promise<NoteSnapshot | null> {
		try {
			const note = await prisma.organizationNote.findUnique({
				where: { id: noteId },
				select: {
					id: true,
					title: true,
					content: true,
					organizationId: true,
				},
			})

			return note
		} catch (error) {
			console.error('Error capturing note snapshot:', error)
			return null
		}
	}

	/**
	 * Batch process note changes
	 * @param changes - Array of note changes to process
	 */
	async processBatchChanges(
		changes: Array<{
			type: 'created' | 'updated' | 'deleted'
			noteId: string
			userId: string
			beforeSnapshot?: NoteSnapshot
			afterSnapshot?: NoteSnapshot
		}>,
	): Promise<void> {
		try {
			// Process changes asynchronously to avoid blocking
			setImmediate(async () => {
				for (const change of changes) {
					try {
						switch (change.type) {
							case 'created':
								if (change.afterSnapshot) {
									await this.onNoteCreated(change.afterSnapshot, change.userId)
								}
								break
							case 'updated':
								await this.onNoteUpdated(
									change.noteId,
									change.userId,
									change.beforeSnapshot,
									change.afterSnapshot,
								)
								break
							case 'deleted':
								if (change.beforeSnapshot) {
									await this.onNoteDeleted(change.beforeSnapshot, change.userId)
								}
								break
						}
					} catch (error) {
						console.error(
							`Error processing ${change.type} change for note ${change.noteId}:`,
							error,
						)
					}
				}
			})
		} catch (error) {
			console.error('Error setting up batch change processing:', error)
		}
	}
}

// Export singleton instance
export const noteHooks = NoteHooks.getInstance()

/**
 * Convenience functions for easy integration into route handlers
 */

/**
 * Call this after creating a note
 */
export async function triggerNoteCreated(
	noteId: string,
	userId: string,
): Promise<void> {
	await noteHooks.afterNoteCreated(noteId, userId)
}

/**
 * Call this after updating a note
 */
export async function triggerNoteUpdated(
	noteId: string,
	userId: string,
	previousData?: { title: string; content: string },
): Promise<void> {
	await noteHooks.afterNoteUpdated(noteId, userId, previousData)
}

/**
 * Call this before deleting a note
 */
export async function triggerNoteDeleted(
	noteId: string,
	userId: string,
): Promise<void> {
	await noteHooks.beforeNoteDeleted(noteId, userId)
}

/**
 * Utility to wrap note operations with automatic hook triggering
 */
export class NoteOperationWrapper {
	/**
	 * Wrap note creation with automatic hook triggering
	 */
	static async create<T>(
		operation: () => Promise<T>,
		noteId: string,
		userId: string,
	): Promise<T> {
		const result = await operation()
		await triggerNoteCreated(noteId, userId)
		return result
	}

	/**
	 * Wrap note update with automatic hook triggering
	 */
	static async update<T>(
		operation: () => Promise<T>,
		noteId: string,
		userId: string,
		captureSnapshot: boolean = true,
	): Promise<T> {
		let beforeSnapshot: NoteSnapshot | null = null

		if (captureSnapshot) {
			beforeSnapshot = await noteHooks.captureNoteSnapshot(noteId)
		}

		const result = await operation()

		const previousData = beforeSnapshot
			? {
					title: beforeSnapshot.title,
					content: beforeSnapshot.content,
				}
			: undefined

		await triggerNoteUpdated(noteId, userId, previousData)
		return result
	}

	/**
	 * Wrap note deletion with automatic hook triggering
	 */
	static async delete<T>(
		operation: () => Promise<T>,
		noteId: string,
		userId: string,
	): Promise<T> {
		await triggerNoteDeleted(noteId, userId)
		const result = await operation()
		return result
	}
}
