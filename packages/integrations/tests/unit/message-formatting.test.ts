import { describe, it, expect } from 'vitest'
import {
	formatNoteMessage,
	truncateContent,
	generateNoteUrl,
} from '../../src/message-formatting'
import { type OrganizationNote } from '../../src/prisma-types'

describe('Message Formatting', () => {
	describe('truncateContent', () => {
		it('should truncate long content', () => {
			const longContent = 'a'.repeat(600)
			const result = truncateContent(longContent)
			expect(result).toHaveLength(500)
			expect(result.endsWith('...')).toBe(true)
		})

		it('should not truncate short content', () => {
			const shortContent = 'a'.repeat(100)
			const result = truncateContent(shortContent)
			expect(result).toBe(shortContent)
			expect(result).toHaveLength(100)
		})
	})

	describe('generateNoteUrl', () => {
		it('should generate correct URL', () => {
			const note = { id: 'note-123' } as OrganizationNote
			expect(generateNoteUrl(note)).toBe('/notes/note-123')
		})
	})

	describe('formatNoteMessage', () => {
		it('should format note message correctly', () => {
			const note: OrganizationNote = {
				id: 'note-123',
				title: 'Test Note',
				content: 'This is a test note content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const changeType = 'created'
			const author = { name: 'John Doe' }

			const result = formatNoteMessage(note, changeType, author)

			expect(result).toEqual({
				title: 'Test Note',
				content: 'This is a test note content',
				author: 'John Doe',
				noteUrl: '/notes/note-123',
				changeType: 'created',
			})
		})
	})
})
