import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.hoisted(() => {
	process.env.SESSION_SECRET = 'test-session-secret'
	process.env.JWT_SECRET = 'test-jwt-secret-key'
	process.env.DATABASE_URL = 'file:./data.db'
	process.env.USE_S3_STORAGE = 'false'
	process.env.AWS_ENDPOINT_URL_S3 = 'http://localhost:9000'
	process.env.AWS_REGION = 'us-east-1'
	process.env.AWS_ACCESS_KEY_ID = 'test'
	process.env.AWS_SECRET_ACCESS_KEY = 'test'
	process.env.S3_BUCKET_NAME = 'test'
	process.env.BUCKET_NAME = 'test'
})

import { prisma } from '@repo/database'
import { action as createStatusAction } from './notes.statuses.tsx'
import { action as reorderNotesAction } from './notes.reorder.tsx'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '#app/utils/organization/permissions.server.ts'
import { validateOrgAccess } from '#app/utils/organization/loader.server.ts'

vi.mock(
	'#app/utils/organization/permissions.server.ts',
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import('#app/utils/organization/permissions.server.ts')
			>()
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

vi.mock('#app/utils/organization/loader.server.ts', () => ({
	validateOrgAccess: vi.fn(),
}))

vi.mock('@repo/auth', () => ({
	requireUserId: vi.fn().mockResolvedValue('user-read-only'),
}))

vi.mock('@repo/database', () => ({
	prisma: {
		organization: {
			findFirst: vi.fn(),
		},
		organizationNoteStatus: {
			findFirst: vi.fn(),
			aggregate: vi.fn(),
			create: vi.fn(),
		},
		organizationNote: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}))

describe('Kanban Routes Authorization (WO-88)', () => {
	const mockRequirePermission = vi.mocked(requireUserWithOrganizationPermission)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('notes.statuses action (Create Status)', () => {
		it('denies read-only roles lacking UPDATE_SETTINGS_ANY (403)', async () => {
			vi.mocked(prisma.organization.findFirst).mockResolvedValue({
				id: 'org-123',
			} as any)
			mockRequirePermission.mockRejectedValue(
				new Response('Insufficient permissions', { status: 403 }),
			)

			const formData = new FormData()
			formData.append('name', 'In Progress')

			const request = new Request(
				'http://localhost:3000/org-slug/notes/statuses',
				{
					method: 'POST',
					body: formData,
				},
			)

			await expect(
				createStatusAction({
					request,
					params: { orgSlug: 'org-slug' },
					context: {},
				} as any),
			).rejects.toThrow(Response)

			expect(mockRequirePermission).toHaveBeenCalledWith(
				request,
				'org-123',
				'update:settings:any',
			)
		})
	})

	describe('notes.reorder action (Reorder Notes)', () => {
		it('denies read-only user updating a note created by another user when lacking UPDATE_NOTE_ANY (403)', async () => {
			vi.mocked(validateOrgAccess).mockResolvedValue({ id: 'org-123' } as any)
			vi.mocked(prisma.organizationNote.findFirst).mockResolvedValue({
				id: 'note-456',
				createdById: 'user-other',
			} as any)

			mockRequirePermission.mockRejectedValue(
				new Response('Insufficient permissions', { status: 403 }),
			)

			const formData = new FormData()
			formData.append('noteId', 'note-456')
			formData.append('position', '2')

			const request = new Request(
				'http://localhost:3000/org-slug/notes/reorder',
				{
					method: 'POST',
					body: formData,
				},
			)

			await expect(
				reorderNotesAction({
					request,
					params: { orgSlug: 'org-slug' },
					context: {},
				} as any),
			).rejects.toThrow(Response)

			expect(mockRequirePermission).toHaveBeenCalledWith(
				request,
				'org-123',
				'update:note:org',
			)
		})
	})
})
