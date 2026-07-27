import { parseWithZod } from '@conform-to/zod'
import { parseFormData } from '@mjackson/form-data-parser'
import { createId as cuid } from '@paralleldrive/cuid2'
import { logNoteActivity } from '@repo/audit'
import { requireUserId } from '@repo/auth'
import { markStepCompleted } from '@repo/common/onboarding'
import { prisma } from '@repo/database'
import { noteHooks } from '@repo/integrations'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { sanitizeNoteContent } from '#app/utils/content-sanitization.server.ts'
import {
	processNoteMediaUploads,
	triggerMediaProcessingJobs,
} from '#app/utils/note-media-pipeline.server.ts'
import {
	MAX_UPLOAD_SIZE,
	OrgNoteEditorSchema,
} from './__org-note-editor'

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug

	// Find organization ID - ensure user is an active member
	const organization = await prisma.organization.findFirst({
		where: {
			slug: orgSlug,
			active: true,
			users: { some: { userId, active: true } },
		},
		select: { id: true },
	})

	if (!organization) {
		throw new Response('Organization not found or you do not have access', {
			status: 404,
		})
	}

	const formData = await parseFormData(request, {
		maxFileSize: MAX_UPLOAD_SIZE * 10, // Allow larger files for videos
	})

	const submission = await parseWithZod(formData, {
		schema: OrgNoteEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const note = await prisma.organizationNote.findUnique({
				select: { id: true },
				where: { id: data.id, organizationId: organization.id },
			})
			if (!note) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Note not found',
				})
			}
		}).transform(async ({ images = [], media = [], ...data }) => {
			const noteId = data.id ?? cuid()

			const { uploadUpdates, newUploads } = await processNoteMediaUploads(
				userId,
				noteId,
				organization.id,
				images,
				media,
			)

			return {
				...data,
				id: noteId,
				uploadUpdates,
				newUploads,
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const {
		id: noteId,
		title,
		content,
		priority,
		tags,
		uploadUpdates = [],
		newUploads = [],
		actionType,
	} = submission.value

	// SECURITY: Sanitize note content to prevent XSS attacks
	const sanitizedContent = sanitizeNoteContent(content)

	// Process tags - convert comma-separated string to JSON array
	const processedTags = tags
		? JSON.stringify(
				tags
					.split(',')
					.map((tag) => tag.trim())
					.filter((tag) => tag.length > 0),
			)
		: null

	// Process priority - convert empty string to null and validate
	const processedPriority =
		priority &&
		priority !== '' &&
		['low', 'medium', 'high', 'urgent', 'no-priority'].includes(priority)
			? priority
			: null

	// Check if this is a new note or an update
	const existingNote = await prisma.organizationNote.findUnique({
		where: { id: noteId },
		select: {
			id: true,
			title: true,
			content: true,
			priority: true,
			tags: true,
		},
	})

	const isNewNote = !existingNote
	let beforeSnapshot:
		| {
				title: string
				content: string
				priority: string | null
				tags: string | null
		  }
		| undefined

	if (!isNewNote && existingNote) {
		beforeSnapshot = {
			title: existingNote.title,
			content: existingNote.content,
			priority: existingNote.priority,
			tags: existingNote.tags,
		}
	}

	const updatedNote = await prisma.organizationNote.upsert({
		select: { id: true },
		where: { id: noteId },
		create: {
			id: noteId,
			title,
			content: sanitizedContent,
			priority: processedPriority,
			tags: processedTags,
			organization: { connect: { id: organization.id } },
			createdBy: { connect: { id: userId } },
			uploads: { create: newUploads },
		},
		update:
			actionType === 'inline-edit'
				? {
						title,
						content: sanitizedContent,
					}
				: {
						title,
						content: sanitizedContent,
						priority: processedPriority,
						tags: processedTags,
						uploads: {
							deleteMany: {
								id: {
									notIn: uploadUpdates
										.map((u) => u.id)
										.filter((id): id is string => Boolean(id)),
								},
							},
							updateMany: uploadUpdates.map((updates) => ({
								where: { id: updates.id },
								data: {
									...updates,
									// If the upload is new, we need to generate a new ID to bust the cache.
									id: updates.objectKey ? cuid() : updates.id,
								},
							})),
							create: newUploads,
						},
					},
	})

	// Trigger processing background jobs for new media
	await triggerMediaProcessingJobs(
		updatedNote.id,
		organization.id,
		userId,
		newUploads,
	)

	// Log activity
	if (isNewNote) {
		await logNoteActivity({
			noteId: updatedNote.id,
			userId,
			action: 'created',
			metadata: { title, hasUploads: newUploads.length > 0 },
		})

		// Track onboarding step completion for creating first note
		try {
			await markStepCompleted(userId, organization.id, 'create_first_note', {
				completedVia: 'note_creation',
				noteId: updatedNote.id,
				noteTitle: title,
			})
		} catch (error) {
			// Don't fail the note creation if onboarding tracking fails
			console.error('Failed to track note creation onboarding step:', error)
		}
	} else if (beforeSnapshot) {
		// Determine what changed
		const titleChanged = beforeSnapshot.title !== title
		const contentChanged = beforeSnapshot.content !== content
		const priorityChanged = beforeSnapshot.priority !== processedPriority
		const tagsChanged = beforeSnapshot.tags !== processedTags

		await logNoteActivity({
			noteId: updatedNote.id,
			userId,
			action: 'updated',
			metadata: {
				titleChanged,
				contentChanged,
				priorityChanged,
				tagsChanged,
				hasUploadUpdates: uploadUpdates.length > 0 || newUploads.length > 0,
			},
		})
	}

	// Trigger integration hooks
	if (isNewNote) {
		await noteHooks.afterNoteCreated(updatedNote.id, userId)
	} else {
		await noteHooks.afterNoteUpdated(updatedNote.id, userId, beforeSnapshot)
	}

	if (actionType === 'inline-edit') {
		return data({ result: submission.reply() }, { status: 200 })
	}

	return redirect(`/${orgSlug}/notes/${updatedNote.id}`)
}
