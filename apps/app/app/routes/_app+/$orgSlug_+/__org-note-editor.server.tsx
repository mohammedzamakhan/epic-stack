import { parseWithZod } from '@conform-to/zod'
import { parseFormData } from '@mjackson/form-data-parser'
import { createId as cuid } from '@paralleldrive/cuid2'
import {
	triggerVideoProcessing,
	triggerImageProcessing,
} from '@repo/background-jobs'
import { noteHooks } from '@repo/integrations'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { logNoteActivity } from '#app/utils/activity-log.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { sanitizeNoteContent } from '#app/utils/content-sanitization.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { markStepCompleted } from '@repo/common'
import {
	uploadNoteImage,
	uploadNoteVideo,
	getSignedGetRequestInfo,
} from '#app/utils/storage.server.ts'
import {
	MAX_UPLOAD_SIZE,
	OrgNoteEditorSchema,
	type ImageFieldset,
	type MediaFieldset,
} from './__org-note-editor'

type UploadFieldset = (ImageFieldset | MediaFieldset) & { type?: string }

function uploadHasId(
	upload: UploadFieldset,
): upload is UploadFieldset & { id: string } {
	return Boolean(upload.id)
}

function uploadHasFile(
	upload: UploadFieldset,
): upload is UploadFieldset & { file: File } {
	return Boolean(upload.file?.size && upload.file?.size > 0)
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug

	// Video processing will handle thumbnail uploads internally

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

			// Process all uploads (images, videos, and legacy images)
			const allUploads = [
				...images.map((img) => ({ ...img, type: 'image' })),
				...media.map((m) => ({
					...m,
					type:
						m.type || (m.file?.type?.startsWith('video/') ? 'video' : 'image'),
				})),
			]

			return {
				...data,
				id: noteId,
				uploadUpdates: await Promise.all(
					allUploads.filter(uploadHasId).map(async (upload) => {
						if (uploadHasFile(upload)) {
							const isVideo =
								upload.type === 'video' ||
								upload.file?.type?.startsWith('video/')
							const objectKey = isVideo
								? await uploadNoteVideo(
										userId,
										noteId,
										upload.file,
										organization.id,
									)
								: await uploadNoteImage(
										userId,
										noteId,
										upload.file,
										organization.id,
									)

							return {
								id: upload.id,
								type: isVideo ? 'video' : 'image',
								altText: upload.altText,
								objectKey,
								mimeType: upload.file?.type,
								fileSize: upload.file?.size,
								status: 'processing',
							}
						} else {
							return {
								id: upload.id,
								altText: upload.altText,
							}
						}
					}),
				),
				newUploads: await Promise.all(
					allUploads
						.filter(uploadHasFile)
						.filter((upload) => !upload.id)
						.map(async (upload) => {
							const isVideo =
								upload.type === 'video' ||
								upload.file?.type?.startsWith('video/')
							const objectKey = isVideo
								? await uploadNoteVideo(
										userId,
										noteId,
										upload.file,
										organization.id,
									)
								: await uploadNoteImage(
										userId,
										noteId,
										upload.file,
										organization.id,
									)

							return {
								type: isVideo ? 'video' : 'image',
								altText: upload.altText,
								objectKey,
								mimeType: upload.file?.type,
								fileSize: upload.file?.size,
								status: 'processing',
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

	// Trigger video processing for new video uploads
	const newVideoUploads = newUploads.filter((upload) => upload.type === 'video')
	for (const video of newVideoUploads) {
		try {
			// Get the created video upload record to get its ID
			const videoRecord = await prisma.organizationNoteUpload.findFirst({
				where: {
					noteId: updatedNote.id,
					objectKey: video.objectKey,
					type: 'video',
				},
				select: { id: true },
			})

			if (videoRecord) {
				// Generate a signed URL for the video that the background task can use
				const { url: signedVideoUrl, headers: videoHeaders } =
					getSignedGetRequestInfo(video.objectKey)

				await triggerVideoProcessing({
					videoUrl: signedVideoUrl,
					videoHeaders,
					videoId: videoRecord.id,
					noteId: updatedNote.id,
					organizationId: organization.id,
					userId,
				})
			}
		} catch (error) {
			console.error('Failed to trigger video processing:', error)
			// Don't fail the note creation if video processing fails
		}
	}

	// Trigger image processing for new image uploads
	const newImageUploads = newUploads.filter((upload) => upload.type === 'image')
	for (const image of newImageUploads) {
		try {
			// Get the created image upload record to get its ID
			const imageRecord = await prisma.organizationNoteUpload.findFirst({
				where: {
					noteId: updatedNote.id,
					objectKey: image.objectKey,
					type: 'image',
				},
				select: { id: true },
			})

			if (imageRecord) {
				// Generate a signed URL for the image that the background task can use
				const { url: signedImageUrl, headers: imageHeaders } =
					getSignedGetRequestInfo(image.objectKey)

				await triggerImageProcessing({
					imageUrl: signedImageUrl,
					imageHeaders,
					imageId: imageRecord.id,
					noteId: updatedNote.id,
					organizationId: organization.id,
					userId,
				})
			}
		} catch (error) {
			console.error('Failed to trigger image processing:', error)
			// Don't fail the note creation if image processing fails
		}
	}

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
