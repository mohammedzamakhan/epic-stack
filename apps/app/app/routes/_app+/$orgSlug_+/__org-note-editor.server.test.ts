import { requireUserId } from '@repo/auth'
import type * as DatabaseModule from '@repo/database'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type * as PermissionsModule from '#app/utils/organization/permissions.server.ts'
import { requireUserWithOrganizationPermission } from '#app/utils/organization/permissions.server.ts'
import {
	mockDb,
	mockSelectResults,
	resetMockDb,
} from '#tests/setup/drizzle-mock.ts'
import { action } from './__org-note-editor.server.tsx'

vi.hoisted(() => {
	process.env.SESSION_SECRET = 'test-session-secret'
	process.env.JWT_SECRET = 'test-jwt-secret-key'
	process.env.DATABASE_URL = 'file:./data.db'
	process.env.AWS_ENDPOINT_URL_S3 = 'http://localhost:9000'
	process.env.AWS_REGION = 'us-east-1'
	process.env.AWS_ACCESS_KEY_ID = 'test'
	process.env.AWS_SECRET_ACCESS_KEY = 'test'
	process.env.S3_BUCKET_NAME = 'test'
	process.env.BUCKET_NAME = 'test'
})

vi.mock('@repo/auth', () => ({
	requireUserId: vi.fn(),
}))

vi.mock(
	'#app/utils/organization/permissions.server.ts',
	async (importOriginal) => {
		const actual = await importOriginal<typeof PermissionsModule>()
		return {
			...actual,
			ORG_PERMISSIONS: actual.ORG_PERMISSIONS ?? {
				CREATE_NOTE_OWN: 'create:note:own',
				UPDATE_NOTE_OWN: 'update:note:own',
				UPDATE_NOTE_ANY: 'update:note:org',
				UPDATE_SETTINGS_ANY: 'update:settings:any',
			},
			requireUserWithOrganizationPermission: vi.fn(),
		}
	},
)

vi.mock('@repo/database', async (importOriginal) => {
	const actual = await importOriginal<typeof DatabaseModule>()
	const { mockDb, drizzleTable, drizzleOperator } =
		await import('#tests/setup/drizzle-mock.ts')
	return {
		...actual,
		db: mockDb,
		Organization: drizzleTable,
		OrganizationNote: drizzleTable,
		OrganizationNoteUpload: drizzleTable,
		UserOrganization: drizzleTable,
		and: drizzleOperator,
		eq: drizzleOperator,
		inArray: drizzleOperator,
		notInArray: drizzleOperator,
	}
})

vi.mock('#app/utils/content-sanitization.server.ts', () => ({
	sanitizeNoteContent: (c: string) => c,
}))

vi.mock('#app/utils/note-media-pipeline.server.ts', () => ({
	processNoteMediaUploads: vi
		.fn()
		.mockResolvedValue({ uploadUpdates: [], newUploads: [] }),
}))

vi.mock('@repo/audit', () => ({
	logNoteActivity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@repo/common/onboarding', () => ({
	markStepCompleted: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@repo/integrations', () => ({
	noteHooks: {
		afterNoteCreated: vi.fn().mockResolvedValue(undefined),
		afterNoteUpdated: vi.fn().mockResolvedValue(undefined),
	},
}))

describe('__org-note-editor.server action (WO-84 Write Authorization)', () => {
	const mockRequireUserId = vi.mocked(requireUserId)
	const mockRequirePermission = vi.mocked(requireUserWithOrganizationPermission)

	beforeEach(() => {
		resetMockDb()
		mockRequireUserId.mockResolvedValue('user-123')
		mockSelectResults([{ id: 'org-123' }])
	})

	it('denies note creation when member lacks CREATE_NOTE_OWN', async () => {
		mockRequirePermission.mockRejectedValue(
			new Response('Insufficient permissions', { status: 403 }),
		)

		const formData = new FormData()
		formData.append('title', 'New Note')
		formData.append('content', 'Content')

		const request = new Request('http://localhost:3000/org-slug/notes/new', {
			method: 'POST',
			body: formData,
		})

		await expect(
			action({ request, params: { orgSlug: 'org-slug' }, context: {} } as any),
		).rejects.toThrow(Response)

		expect(mockRequirePermission).toHaveBeenCalledWith(
			request,
			'org-123',
			'create:note:own',
		)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it('denies update and prevents blind-overwrite when note is owned by another user and member lacks UPDATE_NOTE_ANY', async () => {
		mockSelectResults(
			[{ id: 'org-123' }],
			[{ id: 'note-456', createdById: 'user-other' }],
		)

		mockRequirePermission.mockRejectedValue(
			new Response('Insufficient permissions', { status: 403 }),
		)

		const formData = new FormData()
		formData.append('id', 'note-456')
		formData.append('title', 'Updated Title')
		formData.append('content', 'Updated Content')

		const request = new Request(
			'http://localhost:3000/org-slug/notes/note-456/edit',
			{
				method: 'POST',
				body: formData,
			},
		)

		await expect(
			action({ request, params: { orgSlug: 'org-slug' }, context: {} } as any),
		).rejects.toThrow(Response)

		expect(mockRequirePermission).toHaveBeenCalledWith(
			request,
			'org-123',
			'update:note:org',
		)
		expect(mockDb.insert).not.toHaveBeenCalled()
	})

	it('throws 404 when target note id does not exist in organization', async () => {
		mockSelectResults([{ id: 'org-123' }], [])

		const formData = new FormData()
		formData.append('id', 'non-existent-note')
		formData.append('title', 'Title')
		formData.append('content', 'Content')

		const request = new Request('http://localhost:3000/org-slug/notes/new', {
			method: 'POST',
			body: formData,
		})

		try {
			await action({
				request,
				params: { orgSlug: 'org-slug' },
				context: {},
			} as any)
			expect.fail('Should have thrown 404')
		} catch (error: any) {
			expect(error).toBeInstanceOf(Response)
			expect(error.status).toBe(404)
		}
	})
})
