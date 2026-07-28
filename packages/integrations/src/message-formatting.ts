import { type OrganizationNote } from './prisma-types'
import { type MessageData } from './types'

/**
 * Truncate content to a reasonable length for external posting
 * @param content - Original content
 * @param maxLength - Maximum length (default 500)
 * @returns Truncated content
 */
export function truncateContent(
	content: string,
	maxLength: number = 500,
): string {
	if (content.length <= maxLength) {
		return content
	}

	return content.substring(0, maxLength - 3) + '...'
}

/**
 * Generate URL for a note
 * @param note - Note data
 * @returns Note URL
 */
export function generateNoteUrl(note: OrganizationNote): string {
	// This will need to be implemented based on the app's routing structure
	return `/notes/${note.id}`
}

/**
 * Format note data into message format
 * @param note - Note data
 * @param changeType - Type of change
 * @param author - Author information
 * @returns Formatted message data
 */
export function formatNoteMessage(
	note: OrganizationNote,
	changeType: 'created' | 'updated' | 'deleted',
	author: { name: string },
): MessageData {
	return {
		title: note.title,
		content: truncateContent(note.content || ''),
		author: author.name,
		noteUrl: generateNoteUrl(note),
		changeType,
	}
}

/**
 * Message formatter interface for different providers
 */
export interface MessageFormatter {
	formatNoteCreated(
		note: OrganizationNote,
		author: { name: string },
	): MessageData
	formatNoteUpdated(
		note: OrganizationNote,
		author: { name: string },
		changes?: string[],
	): MessageData
	formatNoteDeleted(noteTitle: string, author: { name: string }): MessageData
}

/**
 * Base message formatter with common functionality
 */
export abstract class BaseMessageFormatter implements MessageFormatter {
	abstract formatNoteCreated(
		note: OrganizationNote,
		author: { name: string },
	): MessageData
	abstract formatNoteUpdated(
		note: OrganizationNote,
		author: { name: string },
		changes?: string[],
	): MessageData
	abstract formatNoteDeleted(
		noteTitle: string,
		author: { name: string },
	): MessageData

	/**
	 * Truncate content for external posting
	 * @param content - Original content
	 * @param maxLength - Maximum length
	 * @returns Truncated content
	 */
	protected truncateContent(content: string, maxLength: number = 500): string {
		return truncateContent(content, maxLength)
	}

	/**
	 * Generate note URL
	 * @param note - Note data
	 * @returns Note URL
	 */
	protected generateNoteUrl(note: OrganizationNote): string {
		return generateNoteUrl(note)
	}
}
