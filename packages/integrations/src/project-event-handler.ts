/**
 * Project Event Handler - Handles integration notifications for project events
 */

import { prisma } from '@repo/database'
import { logger } from '@repo/observability'

interface EventResult {
	success: boolean
	connectionsNotified: number
	errors: string[]
}

export class ProjectEventHandler {
	private static instance: ProjectEventHandler

	static getInstance(): ProjectEventHandler {
		if (!ProjectEventHandler.instance) {
			ProjectEventHandler.instance = new ProjectEventHandler()
		}
		return ProjectEventHandler.instance
	}

	/**
	 * Handle project creation event
	 */
	async handleProjectCreated(
		projectId: string,
		userId: string,
	): Promise<EventResult> {
		const result: EventResult = {
			success: true,
			connectionsNotified: 0,
			errors: [],
		}

		try {
			// Get project details
			const project = await prisma.project.findUnique({
				where: { id: projectId },
				include: {
					organization: true,
					createdBy: true,
					integrationConnections: {
						where: { isActive: true },
						include: { integration: true },
					},
				},
			})

			if (!project) {
				result.success = false
				result.errors.push('Project not found')
				return result
			}

			// Process each integration connection
			for (const connection of project.integrationConnections) {
				try {
					await this.notifyIntegration(
						connection.integration,
						'project_created',
						{
							projectId: project.id,
							projectName: project.name,
							projectDescription: project.description,
							createdBy: project.createdBy.name || project.createdBy.username,
							organizationName: project.organization.name,
						},
					)
					result.connectionsNotified++
				} catch (error) {
					const errorMsg = `Failed to notify integration ${connection.integration.providerName}: ${error}`
					result.errors.push(errorMsg)
					logger.error(
						{ err: error, projectId, integrationId: connection.integrationId },
						errorMsg,
					)
				}
			}
		} catch (error) {
			result.success = false
			result.errors.push(`Failed to process project creation: ${error}`)
			logger.error(
				{ err: error, projectId, userId },
				'Failed to handle project creation',
			)
		}

		return result
	}

	/**
	 * Handle project update event
	 */
	async handleProjectUpdated(
		projectId: string,
		userId: string,
		previousData?: { name: string; description?: string | null },
	): Promise<EventResult> {
		const result: EventResult = {
			success: true,
			connectionsNotified: 0,
			errors: [],
		}

		try {
			// Get project details
			const project = await prisma.project.findUnique({
				where: { id: projectId },
				include: {
					organization: true,
					createdBy: true,
					integrationConnections: {
						where: { isActive: true },
						include: { integration: true },
					},
				},
			})

			if (!project) {
				result.success = false
				result.errors.push('Project not found')
				return result
			}

			// Check what changed
			const changes: Record<string, any> = {}
			if (previousData) {
				if (previousData.name !== project.name) {
					changes.name = { from: previousData.name, to: project.name }
				}
				if (previousData.description !== project.description) {
					changes.description = {
						from: previousData.description,
						to: project.description,
					}
				}
			}

			// Only notify if there are actual changes
			if (Object.keys(changes).length === 0) {
				return result
			}

			// Process each integration connection
			for (const connection of project.integrationConnections) {
				try {
					await this.notifyIntegration(
						connection.integration,
						'project_updated',
						{
							projectId: project.id,
							projectName: project.name,
							projectDescription: project.description,
							changes,
							updatedBy: project.createdBy.name || project.createdBy.username,
							organizationName: project.organization.name,
						},
					)
					result.connectionsNotified++
				} catch (error) {
					const errorMsg = `Failed to notify integration ${connection.integration.providerName}: ${error}`
					result.errors.push(errorMsg)
					logger.error(
						{ err: error, projectId, integrationId: connection.integrationId },
						errorMsg,
					)
				}
			}
		} catch (error) {
			result.success = false
			result.errors.push(`Failed to process project update: ${error}`)
			logger.error(
				{ err: error, projectId, userId },
				'Failed to handle project update',
			)
		}

		return result
	}

	/**
	 * Handle recording creation event
	 */
	async handleRecordingCreated(
		recordingId: string,
		userId: string,
	): Promise<EventResult> {
		const result: EventResult = {
			success: true,
			connectionsNotified: 0,
			errors: [],
		}

		try {
			// Get recording details
			const recording = await prisma.recording.findUnique({
				where: { id: recordingId },
				include: {
					project: {
						include: {
							organization: true,
							integrationConnections: {
								where: { isActive: true },
								include: { integration: true },
							},
						},
					},
					createdBy: true,
				},
			})

			if (!recording) {
				result.success = false
				result.errors.push('Recording not found')
				return result
			}

			// Process each integration connection from the project
			for (const connection of recording.project.integrationConnections) {
				try {
					await this.notifyIntegration(
						connection.integration,
						'recording_created',
						{
							recordingId: recording.id,
							recordingTitle: recording.title,
							recordingDescription: recording.description,
							projectName: recording.project.name,
							createdBy:
								recording.createdBy.name || recording.createdBy.username,
							organizationName: recording.project.organization.name,
							status: recording.status,
							priority: recording.priority,
						},
					)
					result.connectionsNotified++
				} catch (error) {
					const errorMsg = `Failed to notify integration ${connection.integration.providerName}: ${error}`
					result.errors.push(errorMsg)
					logger.error(
						{
							err: error,
							recordingId,
							integrationId: connection.integrationId,
						},
						errorMsg,
					)
				}
			}
		} catch (error) {
			result.success = false
			result.errors.push(`Failed to process recording creation: ${error}`)
			logger.error(
				{ err: error, recordingId, userId },
				'Failed to handle recording creation',
			)
		}

		return result
	}

	/**
	 * Notify an integration about an event
	 */
	private async notifyIntegration(
		integration: any,
		eventType: string,
		eventData: Record<string, any>,
	): Promise<void> {
		// This is a placeholder for actual integration notification logic
		// In a real implementation, you would:
		// 1. Format the message according to the integration's requirements
		// 2. Send the notification via the integration's API
		// 3. Handle rate limiting and retries
		// 4. Log the notification attempt

		logger.info(
			{
				integrationId: integration.id,
				providerName: integration.providerName,
				eventType,
				eventData,
			},
			'Integration notification sent',
		)

		// Log the integration activity
		await prisma.integrationLog.create({
			data: {
				integrationId: integration.id,
				action: eventType,
				status: 'success',
				requestData: JSON.stringify(eventData),
				responseData: JSON.stringify({ notified: true }),
			},
		})
	}
}

// Export singleton instance
export const projectEventHandler = ProjectEventHandler.getInstance()
