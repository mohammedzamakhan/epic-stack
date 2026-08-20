import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryChain, mockDb, resetMockDb } from '../utils/mock-database'

vi.mock('@repo/database', () => {
	const table = new Proxy({}, { get: (_, property) => property })
	return {
		db: mockDb,
		OrganizationNote: table,
		eq: vi.fn(),
	}
})

import {
	NoteOperationWrapper,
	noteHooks,
	triggerNoteCreated,
} from '../../src/note-hooks'
import { noteNotifier } from '../../src/note-notifier'

describe('NoteHooks with Drizzle', () => {
	beforeEach(() => {
		resetMockDb()
		vi.restoreAllMocks()
	})

	it('captures a note snapshot with a selected projection', async () => {
		const snapshot = {
			id: 'note-1',
			title: 'Title',
			content: 'Content',
			organizationId: 'org-1',
		}
		mockDb.select.mockImplementationOnce(() => queryChain([snapshot]))

		await expect(noteHooks.captureNoteSnapshot('note-1')).resolves.toEqual(
			snapshot,
		)
		expect(mockDb.select).toHaveBeenCalled()
	})

	it('returns null when the note does not exist', async () => {
		mockDb.select.mockImplementationOnce(() => queryChain([]))

		await expect(noteHooks.captureNoteSnapshot('missing')).resolves.toBeNull()
	})

	it('triggers notifications after creating a note', async () => {
		const notify = vi
			.spyOn(noteNotifier, 'notify')
			.mockResolvedValue({ success: true, connectionsNotified: 1, errors: [] })

		await triggerNoteCreated('note-1', 'user-1')
		await new Promise<void>((resolve) => setImmediate(resolve))

		expect(notify).toHaveBeenCalledWith('note-1', 'created', 'user-1')
	})

	it('wraps a note operation and returns its result', async () => {
		const operation = vi.fn().mockResolvedValue('saved')
		vi.spyOn(noteNotifier, 'notify').mockResolvedValue({
			success: true,
			connectionsNotified: 0,
			errors: [],
		})

		await expect(
			NoteOperationWrapper.create(operation, 'note-1', 'user-1'),
		).resolves.toBe('saved')
		expect(operation).toHaveBeenCalledOnce()
	})
})
