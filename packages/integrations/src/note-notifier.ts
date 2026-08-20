import {
	Integration as IntegrationTable,
	IntegrationLog as IntegrationLogTable,
	NoteIntegrationConnection as ConnectionTable,
	OrganizationNote as NoteTable,
	User as UserTable,
	and,
	db,
	eq,
} from '@repo/database'
import { formatNoteMessage } from './message-formatting'
import { providerRegistry } from './provider'

export type NoteChangeType = 'created' | 'updated' | 'deleted'

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

export interface NoteEventResult {
	success: boolean
	connectionsNotified: number
	errors: string[]
}

export class NoteNotifier {
	private static instance: NoteNotifier

	static getInstance(): NoteNotifier {
		if (!NoteNotifier.instance) {
			NoteNotifier.instance = new NoteNotifier()
		}
		return NoteNotifier.instance
	}

	async notify(
		noteId: string,
		changeType: NoteChangeType,
		userId: string,
		deletedNoteSnapshot?: any,
	): Promise<NoteEventResult> {
		try {
			const connectionRows = await db
				.select()
				.from(ConnectionTable)
				.where(
					and(
						eq(ConnectionTable.noteId, noteId),
						eq(ConnectionTable.isActive, true),
					),
				)
			const connections = await Promise.all(
				connectionRows.map(async (connection) => {
					const [integration] = await db
						.select()
						.from(IntegrationTable)
						.where(eq(IntegrationTable.id, connection.integrationId))
						.limit(1)
					return { ...connection, integration }
				}),
			)

			if (connections.length === 0) {
				return { success: true, connectionsNotified: 0, errors: [] }
			}

			let note
			if (changeType === 'deleted' && deletedNoteSnapshot) {
				note = deletedNoteSnapshot
			} else {
				const [noteRow] = await db
					.select()
					.from(NoteTable)
					.where(eq(NoteTable.id, noteId))
					.limit(1)
				note = noteRow
			}

			if (!note) {
				return {
					success: false,
					connectionsNotified: 0,
					errors: ['Note not found'],
				}
			}

			const [user] = await db
				.select()
				.from(UserTable)
				.where(eq(UserTable.id, userId))
				.limit(1)

			if (!user) {
				return {
					success: false,
					connectionsNotified: 0,
					errors: ['Author not found'],
				}
			}

			const message = formatNoteMessage(note, changeType, {
				name: user.name || user.username || 'Unknown',
			})
			const errors: string[] = []

			const results = await Promise.allSettled(
				connections.map(async (connection: any) => {
					try {
						const provider = providerRegistry.get(
							connection.integration.providerName,
						)
						if (!provider) {
							throw new Error(
								`Provider not found: ${connection.integration.providerName}`,
							)
						}

						await provider.postMessage(connection, message)

						await db
							.update(ConnectionTable)
							.set({ lastPostedAt: new Date() })
							.where(eq(ConnectionTable.id, connection.id))

						await db.insert(IntegrationLogTable).values({
							integrationId: connection.integrationId,
							action: 'post_message',
							status: 'success',
							requestData: JSON.stringify({
								noteId: connection.noteId,
								channelId: connection.externalId,
								changeType: message.changeType,
							}),
						})
					} catch (error) {
						await db.insert(IntegrationLogTable).values({
							integrationId: connection.integrationId,
							action: 'post_message',
							status: 'error',
							requestData: JSON.stringify({
								noteId: connection.noteId,
								channelId: connection.externalId,
								changeType: message.changeType,
							}),
							errorMessage:
								error instanceof Error ? error.message : 'Unknown error',
						})
						throw error
					}
				}),
			)

			let successCount = 0
			for (const result of results) {
				if (result.status === 'fulfilled') {
					successCount++
				} else {
					errors.push(
						result.reason instanceof Error
							? result.reason.message
							: String(result.reason),
					)
				}
			}

			if (errors.length > 0) {
				console.warn(
					`Note notification: ${successCount} succeeded, ${errors.length} failed`,
				)
			}

			return {
				success: errors.length === 0,
				connectionsNotified: successCount,
				errors,
			}
		} catch (error) {
			console.error('Error in NoteNotifier.notify:', error)
			return {
				success: false,
				connectionsNotified: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error'],
			}
		}
	}
}

export const noteNotifier = NoteNotifier.getInstance()
