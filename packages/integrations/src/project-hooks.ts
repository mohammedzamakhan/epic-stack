/**
 * Project Hooks - Middleware for automatically triggering integration notifications
 *
 * This module provides hooks and middleware that automatically detect project changes
 * and trigger integration notifications without requiring manual intervention.
 */

import { prisma } from '@repo/database'
import { projectEventHandler } from './project-event-handler'

/**
 * Project data for change detection
 */
interface ProjectSnapshot {
	id: string
	name: string
	description?: string | null
	organizationId: string
}

/**
 * Project Hooks class
 *
 * Provides middleware functions that can be called from route handlers
 * to automatically trigger integration notifications.
 */
export class ProjectHooks {
	private static instance: ProjectHooks

	/**
	 * Get singleton instance
	 */
	static getInstance(): ProjectHooks {
		if (!ProjectHooks.instance) {
			ProjectHooks.instance = new ProjectHooks()
		}
		return ProjectHooks.instance
	}

	/**
	 * Hook to call after project creation
	 * @param projectId - ID of the created project
	 * @param userId - ID of the user who created the project
	 */
	async afterProjectCreated(projectId: string, userId: string): Promise<void> {
		try {
			// Trigger integration notifications asynchronously
			// Don't await to avoid blocking the main request
			setImmediate(async () => {
				try {
					const result = await projectEventHandler.handleProjectCreated(
						projectId,
						userId,
					)
					if (!result.success) {
						console.warn('Project creation notification failed:', result.errors)
					} else if (result.connectionsNotified > 0) {
						console.log(
							`Project creation notified ${result.connectionsNotified} connections`,
						)
					}
				} catch (error) {
					console.error('Error in afterProjectCreated hook:', error)
				}
			})
		} catch (error) {
			// Don't throw errors from hooks to avoid breaking the main flow
			console.error('Error setting up afterProjectCreated hook:', error)
		}
	}

	/**
	 * Hook to call after project update
	 * @param projectId - ID of the updated project
	 * @param userId - ID of the user who updated the project
	 * @param previousData - Previous project data for change detection
	 */
	async afterProjectUpdated(
		projectId: string,
		userId: string,
		previousData?: { name: string; description?: string | null },
	): Promise<void> {
		try {
			// Trigger integration notifications asynchronously
			setImmediate(async () => {
				try {
					const result = await projectEventHandler.handleProjectUpdated(
						projectId,
						userId,
						previousData,
					)
					if (!result.success) {
						console.warn('Project update notification failed:', result.errors)
					} else if (result.connectionsNotified > 0) {
						console.log(
							`Project update notified ${result.connectionsNotified} connections`,
						)
					}
				} catch (error) {
					console.error('Error in afterProjectUpdated hook:', error)
				}
			})
		} catch (error) {
			console.error('Error setting up afterProjectUpdated hook:', error)
		}
	}

	/**
	 * Hook to call after recording creation
	 * @param recordingId - ID of the created recording
	 * @param userId - ID of the user who created the recording
	 */
	async afterRecordingCreated(
		recordingId: string,
		userId: string,
	): Promise<void> {
		try {
			// Trigger integration notifications asynchronously
			setImmediate(async () => {
				try {
					const result = await projectEventHandler.handleRecordingCreated(
						recordingId,
						userId,
					)
					if (!result.success) {
						console.warn(
							'Recording creation notification failed:',
							result.errors,
						)
					} else if (result.connectionsNotified > 0) {
						console.log(
							`Recording creation notified ${result.connectionsNotified} connections`,
						)
					}
				} catch (error) {
					console.error('Error in afterRecordingCreated hook:', error)
				}
			})
		} catch (error) {
			console.error('Error setting up afterRecordingCreated hook:', error)
		}
	}
}

// Export singleton instance
export const projectHooks = ProjectHooks.getInstance()
