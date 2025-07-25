/**
 * Note Event Handler - Handles note change events and triggers integrations
 *
 * This module provides functionality to:
 * - Detect note changes (create, update, delete)
 * - Trigger integration notifications
 * - Handle different change types
 * - Manage event queuing and processing
 */

import { prisma } from '@repo/prisma'
import { integrationManager } from './integration-manager'

/**
 * Note change event types
 */
export type NoteChangeType = 'created' | 'updated' | 'deleted'

/**
 * Note change event data
 */
export interface NoteChangeEvent {
	noteId: string
	changeType: NoteChangeType
	userId: string
	organizationId: string
	timestamp: Date
	metadata?: {
		previousTitle?: string
		previousContent?: string
		changes?: string[]
	}
}

/**
 * Note event processing result
 */
export interface NoteEventResult {
	success: boolean
	connectionsNotified: number
	errors: string[]
}

/**
 * Note Event Handler class
 *
 * Manages the detection and processing of note change events,
 * triggering appropriate integration notifications.
 */
export class NoteEventHandler {
	private static instance: NoteEventHandler

	/**
	 * Get singleton instance
	 */
	static getInstance(): NoteEventHandler {
		if (!NoteEventHandler.instance) {
			NoteEventHandler.instance = new NoteEventHandler()
		}
		return NoteEventHandler.instance
	}

	/**
	 * Handle note creation event
	 * @param noteId - ID of the created note
	 * @param userId - ID of the user who created the note
	 * @returns Processing result
	 */
	async handleNoteCreated(
		noteId: string,
		userId: string,
	): Promise<NoteEventResult> {
		try {
			// Get note details to extract organization ID
			const note = await prisma.organizationNote.findUnique({
				where: { id: noteId },
				select: {
					id: true,
					organizationId: true,
					title: true,
					content: true,
				},
			})

			if (!note) {
				return {
					success: false,
					connectionsNotified: 0,
					errors: ['Note not found'],
				}
			}

			const event: NoteChangeEvent = {
				noteId,
				changeType: 'created',
				userId,
				organizationId: note.organizationId,
				timestamp: new Date(),
			}

			return await this.processNoteEvent(event)
		} catch (error) {
			console.error('Error handling note creation:', error)
			return {
				success: false,
				connectionsNotified: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
			}
		}
	}

	/**
	 * Handle note update event
	 * @param noteId - ID of the updated note
	 * @param userId - ID of the user who updated the note
	 * @param previousData - Previous note data for change detection
	 * @returns Processing result
	 */
	async handleNoteUpdated(
		noteId: string,
		userId: string,
		previousData?: { title: string; content: string },
	): Promise<NoteEventResult> {
		try {
			// Get current note details
			const note = await prisma.organizationNote.findUnique({
				where: { id: noteId },
				select: {
					id: true,
					organizationId: true,
					title: true,
					content: true,
				},
			})

			if (!note) {
				return {
					success: false,
					connectionsNotified: 0,
					errors: ['Note not found'],
				}
			}

			// Detect changes if previous data is provided
			const changes: string[] = []
			if (previousData) {
				if (previousData.title !== note.title) {
					changes.push('title')
				}
				if (previousData.content !== note.content) {
					changes.push('content')
				}
			}

			const event: NoteChangeEvent = {
				noteId,
				changeType: 'updated',
				userId,
				organizationId: note.organizationId,
				timestamp: new Date(),
				metadata: {
					previousTitle: previousData?.title,
					previousContent: previousData?.content,
					changes,
				},
			}

			return await this.processNoteEvent(event)
		} catch (error) {
			console.error('Error handling note update:', error)
			return {
				success: false,
				connectionsNotified: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
			}
		}
	}

	/**
	 * Handle note deletion event
	 * @param noteId - ID of the deleted note
	 * @param userId - ID of the user who deleted the note
	 * @param noteData - Note data before deletion
	 * @returns Processing result
	 */
	async handleNoteDeleted(
		noteId: string,
		userId: string,
		noteData: { title: string; organizationId: string },
	): Promise<NoteEventResult> {
		try {
			const event: NoteChangeEvent = {
				noteId,
				changeType: 'deleted',
				userId,
				organizationId: noteData.organizationId,
				timestamp: new Date(),
				metadata: {
					previousTitle: noteData.title,
				},
			}

			return await this.processNoteEvent(event)
		} catch (error) {
			console.error('Error handling note deletion:', error)
			return {
				success: false,
				connectionsNotified: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
			}
		}
	}

	/**
	 * Process a note change event
	 * @param event - Note change event to process
	 * @returns Processing result
	 */
	private async processNoteEvent(
		event: NoteChangeEvent,
	): Promise<NoteEventResult> {
		try {
			// Check if there are any active integrations for this organization
			const integrations = await integrationManager.getOrganizationIntegrations(
				event.organizationId,
			)

			if (integrations.length === 0) {
				return {
					success: true,
					connectionsNotified: 0,
					errors: [],
				}
			}

			// Get note connections (only for non-deleted notes)
			let connections = []
			if (event.changeType !== 'deleted') {
				connections = await integrationManager.getNoteConnections(event.noteId)
			} else {
				// For deleted notes, we need to get connections before they're cascade deleted
				// This should be handled by calling this method before the actual deletion
				connections = await prisma.noteIntegrationConnection.findMany({
					where: {
						noteId: event.noteId,
						isActive: true,
					},
					include: {
						integration: true,
					},
				})
			}

			if (connections.length === 0) {
				return {
					success: true,
					connectionsNotified: 0,
					errors: [],
				}
			}

			// Trigger integration notifications
			await integrationManager.handleNoteUpdate(
				event.noteId,
				event.changeType,
				event.userId,
			)

			return {
				success: true,
				connectionsNotified: connections.length,
				errors: [],
			}
		} catch (error) {
			console.error('Error processing note event:', error)
			return {
				success: false,
				connectionsNotified: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
			}
		}
	}

	/**
	 * Batch process multiple note events
	 * @param events - Array of note change events
	 * @returns Array of processing results
	 */
	async processBatchEvents(
		events: NoteChangeEvent[],
	): Promise<NoteEventResult[]> {
		const results: NoteEventResult[] = []

		for (const event of events) {
			try {
				const result = await this.processNoteEvent(event)
				results.push(result)
			} catch (error) {
				results.push({
					success: false,
					connectionsNotified: 0,
					errors: [error instanceof Error ? error.message : 'Unknown error'],
				})
			}
		}

		return results
	}

	/**
	 * Get event processing statistics
	 * @param organizationId - Organization ID to get stats for
	 * @param timeRange - Time range in hours (default: 24)
	 * @returns Event processing statistics
	 */
	async getEventStats(
		organizationId: string,
		timeRange: number = 24,
	): Promise<{
		totalEvents: number
		successfulEvents: number
		failedEvents: number
		connectionsNotified: number
	}> {
		try {
			// Get integration logs for the organization within the time range
			const integrations =
				await integrationManager.getOrganizationIntegrations(organizationId)
			const integrationIds = integrations.map((i) => i.id)

			if (integrationIds.length === 0) {
				return {
					totalEvents: 0,
					successfulEvents: 0,
					failedEvents: 0,
					connectionsNotified: 0,
				}
			}

			const since = new Date(Date.now() - timeRange * 60 * 60 * 1000)

			const logs = await prisma.integrationLog.findMany({
				where: {
					integrationId: { in: integrationIds },
					action: 'post_message',
					createdAt: { gte: since },
				},
				select: {
					status: true,
					requestData: true,
				},
			})

			const totalEvents = logs.length
			const successfulEvents = logs.filter(
				(log) => log.status === 'success',
			).length
			const failedEvents = logs.filter((log) => log.status === 'error').length

			// Count unique connections notified
			const uniqueConnections = new Set()
			logs.forEach((log) => {
				if (log.requestData) {
					try {
						const data = JSON.parse(log.requestData) as {
							noteId: string
							channelId: string
						}
						if (data.noteId && data.channelId) {
							uniqueConnections.add(`${data.noteId}-${data.channelId}`)
						}
					} catch {
						// Ignore parsing errors
					}
				}
			})

			return {
				totalEvents,
				successfulEvents,
				failedEvents,
				connectionsNotified: uniqueConnections.size,
			}
		} catch (error) {
			console.error('Error getting event stats:', error)
			return {
				totalEvents: 0,
				successfulEvents: 0,
				failedEvents: 0,
				connectionsNotified: 0,
			}
		}
	}
}

// Export singleton instance
export const noteEventHandler = NoteEventHandler.getInstance()
