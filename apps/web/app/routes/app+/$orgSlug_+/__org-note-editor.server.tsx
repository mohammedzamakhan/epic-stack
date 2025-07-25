import { parseWithZod } from '@conform-to/zod'
import { parseFormData } from '@mjackson/form-data-parser'
import { createId as cuid } from '@paralleldrive/cuid2'
import { noteHooks } from '@repo/integrations'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { uploadNoteImage } from '#app/utils/storage.server.ts'
import {
	MAX_UPLOAD_SIZE,
	OrgNoteEditorSchema,
	type ImageFieldset,
} from './__org-note-editor'

function imageHasFile(
	image: ImageFieldset,
): image is ImageFieldset & { file: NonNullable<ImageFieldset['file']> } {
	return Boolean(image.file?.size && image.file?.size > 0)
}

function imageHasId(
	image: ImageFieldset,
): image is ImageFieldset & { id: string } {
	return Boolean(image.id)
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug

	// Find organization ID
	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug, users: { some: { userId } } },
		select: { id: true },
	})

	if (!organization) {
		throw new Response('Organization not found or you do not have access', {
			status: 404,
		})
	}

	const formData = await parseFormData(request, {
		maxFileSize: MAX_UPLOAD_SIZE,
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
		}).transform(async ({ images = [], ...data }) => {
			const noteId = data.id ?? cuid()
			return {
				...data,
				id: noteId,
				imageUpdates: await Promise.all(
					images.filter(imageHasId).map(async (i) => {
						if (imageHasFile(i)) {
							return {
								id: i.id,
								altText: i.altText,
								objectKey: await uploadNoteImage(userId, noteId, i.file),
							}
						} else {
							return {
								id: i.id,
								altText: i.altText,
							}
						}
					}),
				),
				newImages: await Promise.all(
					images
						.filter(imageHasFile)
						.filter((i) => !i.id)
						.map(async (image) => {
							return {
								altText: image.altText,
								objectKey: await uploadNoteImage(userId, noteId, image.file),
							}
						}),
				),
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
		imageUpdates = [],
		newImages = [],
	} = submission.value

	// Check if this is a new note or an update
	const existingNote = await prisma.organizationNote.findUnique({
		where: { id: noteId },
		select: { id: true, title: true, content: true },
	})

	const isNewNote = !existingNote
	let beforeSnapshot: { title: string; content: string } | undefined

	if (!isNewNote && existingNote) {
		beforeSnapshot = {
			title: existingNote.title,
			content: existingNote.content,
		}
	}

	const updatedNote = await prisma.organizationNote.upsert({
		select: { id: true },
		where: { id: noteId },
		create: {
			id: noteId,
			title,
			content,
			organization: { connect: { id: organization.id } },
			createdBy: { connect: { id: userId } },
			images: { create: newImages },
		},
		update: {
			title,
			content,
			images: {
				deleteMany: { id: { notIn: imageUpdates.map((i) => i.id) } },
				updateMany: imageUpdates.map((updates) => ({
					where: { id: updates.id },
					data: {
						...updates,
						// If the image is new, we need to generate a new ID to bust the cache.
						id: updates.objectKey ? cuid() : updates.id,
					},
				})),
				create: newImages,
			},
		},
	})

	// Trigger integration hooks
	if (isNewNote) {
		await noteHooks.afterNoteCreated(updatedNote.id, userId)
	} else {
		await noteHooks.afterNoteUpdated(updatedNote.id, userId, beforeSnapshot)
	}

	return redirect(`/app/${orgSlug}/notes/${updatedNote.id}`)
}
