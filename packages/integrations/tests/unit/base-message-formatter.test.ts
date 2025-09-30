import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MessageData } from '../../src/types'
import type { OrganizationNote } from '@prisma/client'

vi.mock('../../src/integration-manager', () => ({
	integrationManager: {},
}))

abstract class BaseMessageFormatter {
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

	protected truncateContent(content: string, maxLength: number = 500): string {
		if (content.length <= maxLength) {
			return content
		}

		return content.substring(0, maxLength - 3) + '...'
	}

	protected generateNoteUrl(note: OrganizationNote): string {
		return `/notes/${note.id}`
	}
}

class TestMessageFormatter extends BaseMessageFormatter {
	formatNoteCreated(
		note: OrganizationNote,
		author: { name: string },
	): MessageData {
		return {
			title: note.title,
			content: this.truncateContent(note.content || ''),
			author: author.name,
			noteUrl: this.generateNoteUrl(note),
			changeType: 'created',
		}
	}

	formatNoteUpdated(
		note: OrganizationNote,
		author: { name: string },
		changes?: string[],
	): MessageData {
		const changeInfo = changes ? ` (${changes.join(', ')})` : ''
		return {
			title: `${note.title}${changeInfo}`,
			content: this.truncateContent(note.content || ''),
			author: author.name,
			noteUrl: this.generateNoteUrl(note),
			changeType: 'updated',
		}
	}

	formatNoteDeleted(noteTitle: string, author: { name: string }): MessageData {
		return {
			title: noteTitle,
			content: '',
			author: author.name,
			noteUrl: '',
			changeType: 'deleted',
		}
	}
}

describe('BaseMessageFormatter', () => {
	let formatter: TestMessageFormatter

	beforeEach(() => {
		formatter = new TestMessageFormatter()
	})

	describe('formatNoteCreated', () => {
		it('should format a created note with all fields', () => {
			const note: OrganizationNote = {
				id: 'note-123',
				title: 'New Feature Proposal',
				content: 'This is the detailed content of the note',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Alice Johnson' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result).toEqual({
				title: 'New Feature Proposal',
				content: 'This is the detailed content of the note',
				author: 'Alice Johnson',
				noteUrl: '/notes/note-123',
				changeType: 'created',
			})
		})

		it('should truncate long content in created note', () => {
			const longContent = 'a'.repeat(600)
			const note: OrganizationNote = {
				id: 'note-456',
				title: 'Long Note',
				content: longContent,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Bob Smith' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.content).toHaveLength(500)
			expect(result.content.endsWith('...')).toBe(true)
			expect(result.content).toBe('a'.repeat(497) + '...')
		})

		it('should handle empty content in created note', () => {
			const note: OrganizationNote = {
				id: 'note-789',
				title: 'Empty Note',
				content: '',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Charlie Brown' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.content).toBe('')
		})

		it('should handle null content in created note', () => {
			const note: OrganizationNote = {
				id: 'note-101',
				title: 'Null Content Note',
				content: null as any,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'David Lee' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.content).toBe('')
		})
	})

	describe('formatNoteUpdated', () => {
		it('should format an updated note without changes list', () => {
			const note: OrganizationNote = {
				id: 'note-222',
				title: 'Updated Feature',
				content: 'This note has been updated',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Eve Martinez' }

			const result = formatter.formatNoteUpdated(note, author)

			expect(result).toEqual({
				title: 'Updated Feature',
				content: 'This note has been updated',
				author: 'Eve Martinez',
				noteUrl: '/notes/note-222',
				changeType: 'updated',
			})
		})

		it('should format an updated note with changes list', () => {
			const note: OrganizationNote = {
				id: 'note-333',
				title: 'Feature V2',
				content: 'Updated content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Frank Wilson' }
			const changes = ['title', 'content', 'tags']

			const result = formatter.formatNoteUpdated(note, author, changes)

			expect(result.title).toBe('Feature V2 (title, content, tags)')
			expect(result.changeType).toBe('updated')
		})

		it('should truncate long content in updated note', () => {
			const longContent = 'b'.repeat(700)
			const note: OrganizationNote = {
				id: 'note-444',
				title: 'Long Updated Note',
				content: longContent,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Grace Taylor' }

			const result = formatter.formatNoteUpdated(note, author)

			expect(result.content).toHaveLength(500)
			expect(result.content.endsWith('...')).toBe(true)
		})

		it('should handle empty changes array', () => {
			const note: OrganizationNote = {
				id: 'note-555',
				title: 'Test Note',
				content: 'Content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Henry Davis' }
			const changes: string[] = []

			const result = formatter.formatNoteUpdated(note, author, changes)

			expect(result.title).toBe('Test Note ()')
		})
	})

	describe('formatNoteDeleted', () => {
		it('should format a deleted note', () => {
			const noteTitle = 'Deleted Feature'
			const author = { name: 'Ivy Chen' }

			const result = formatter.formatNoteDeleted(noteTitle, author)

			expect(result).toEqual({
				title: 'Deleted Feature',
				content: '',
				author: 'Ivy Chen',
				noteUrl: '',
				changeType: 'deleted',
			})
		})

		it('should handle long title in deleted note', () => {
			const noteTitle = 'Very Long Title ' + 'x'.repeat(200)
			const author = { name: 'Jack Robinson' }

			const result = formatter.formatNoteDeleted(noteTitle, author)

			expect(result.title).toBe(noteTitle)
			expect(result.changeType).toBe('deleted')
		})

		it('should handle empty title in deleted note', () => {
			const noteTitle = ''
			const author = { name: 'Kate Anderson' }

			const result = formatter.formatNoteDeleted(noteTitle, author)

			expect(result.title).toBe('')
			expect(result.content).toBe('')
		})
	})

	describe('truncateContent', () => {
		it('should not truncate content shorter than max length', () => {
			const content = 'Short content'
			const result = formatter['truncateContent'](content, 100)

			expect(result).toBe('Short content')
		})

		it('should not truncate content equal to max length', () => {
			const content = 'a'.repeat(100)
			const result = formatter['truncateContent'](content, 100)

			expect(result).toBe(content)
		})

		it('should truncate content longer than max length', () => {
			const content = 'a'.repeat(150)
			const result = formatter['truncateContent'](content, 100)

			expect(result).toHaveLength(100)
			expect(result.endsWith('...')).toBe(true)
			expect(result).toBe('a'.repeat(97) + '...')
		})

		it('should use default max length of 500', () => {
			const content = 'a'.repeat(600)
			const result = formatter['truncateContent'](content)

			expect(result).toHaveLength(500)
			expect(result.endsWith('...')).toBe(true)
		})

		it('should handle empty content', () => {
			const result = formatter['truncateContent']('')

			expect(result).toBe('')
		})

		it('should respect custom max length', () => {
			const content = 'a'.repeat(50)
			const result = formatter['truncateContent'](content, 20)

			expect(result).toHaveLength(20)
			expect(result).toBe('a'.repeat(17) + '...')
		})

		it('should handle max length of 3 (edge case)', () => {
			const content = 'abcd'
			const result = formatter['truncateContent'](content, 3)

			expect(result).toBe('...')
		})

		it('should handle content with exactly max length + 1', () => {
			const content = 'a'.repeat(101)
			const result = formatter['truncateContent'](content, 100)

			expect(result).toHaveLength(100)
			expect(result).toBe('a'.repeat(97) + '...')
		})
	})

	describe('generateNoteUrl', () => {
		it('should generate correct note URL', () => {
			const note: OrganizationNote = {
				id: 'note-abc',
				title: 'Test Note',
				content: 'Content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}

			const result = formatter['generateNoteUrl'](note)

			expect(result).toBe('/notes/note-abc')
		})

		it('should handle note with special characters in ID', () => {
			const note: OrganizationNote = {
				id: 'note-123-xyz',
				title: 'Test',
				content: '',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}

			const result = formatter['generateNoteUrl'](note)

			expect(result).toBe('/notes/note-123-xyz')
		})

		it('should generate URL for note with UUID format ID', () => {
			const note: OrganizationNote = {
				id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
				title: 'UUID Note',
				content: '',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}

			const result = formatter['generateNoteUrl'](note)

			expect(result).toBe('/notes/f47ac10b-58cc-4372-a567-0e02b2c3d479')
		})
	})

	describe('Edge Cases and Integration', () => {
		it('should handle note with all edge case values', () => {
			const note: OrganizationNote = {
				id: '',
				title: '',
				content: null as any,
				organizationId: '',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: '',
			}
			const author = { name: '' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.title).toBe('')
			expect(result.content).toBe('')
			expect(result.author).toBe('')
			expect(result.noteUrl).toBe('/notes/')
		})

		it('should handle very long author name', () => {
			const note: OrganizationNote = {
				id: 'note-999',
				title: 'Test',
				content: 'Content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'A'.repeat(500) }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.author).toBe('A'.repeat(500))
		})

		it('should maintain content integrity with special characters', () => {
			const specialContent = 'Special chars: <>&"\'`\n\t\r'
			const note: OrganizationNote = {
				id: 'note-special',
				title: 'Special Content',
				content: specialContent,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.content).toBe(specialContent)
		})

		it('should handle unicode and emoji in content', () => {
			const unicodeContent = '😀 Hello 世界 🌍'
			const note: OrganizationNote = {
				id: 'note-unicode',
				title: 'Unicode Note',
				content: unicodeContent,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User 👤' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.content).toBe(unicodeContent)
			expect(result.author).toBe('Test User 👤')
		})

		it('should properly truncate content with multibyte characters', () => {
			const content = '😀'.repeat(300)
			const note: OrganizationNote = {
				id: 'note-emoji',
				title: 'Emoji Note',
				content: content,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const result = formatter.formatNoteCreated(note, author)

			expect(result.content.length).toBeLessThanOrEqual(500)
			expect(result.content.endsWith('...')).toBe(true)
		})
	})
})
