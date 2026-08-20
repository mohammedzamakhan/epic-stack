import {
	triggerVideoProcessing,
	triggerImageProcessing,
} from '@repo/background-jobs'
import { and, db, eq, OrganizationNoteUpload } from '@repo/database'
import {
	type ImageFieldset,
	type MediaFieldset,
} from '#app/routes/_app+/$orgSlug_+/__org-note-editor.tsx'
import {
	uploadNoteImage,
	uploadNoteVideo,
	getSignedGetRequestInfo,
} from '#app/utils/storage.server.ts'

type UploadFieldset = (ImageFieldset | MediaFieldset) & { type?: string }

function uploadHasId(
	upload: UploadFieldset,
): upload is UploadFieldset & { id: string } {
	return typeof upload.id === 'string' && upload.id.length > 0
}

function uploadHasFile(
	upload: UploadFieldset,
): upload is UploadFieldset & { file: File } {
	return Boolean(upload.file?.size && upload.file?.size > 0)
}

export interface PreparedUploads {
	uploadUpdates: Array<{
		id: string
		type?: string
		altText?: string
		objectKey?: string
		mimeType?: string
		fileSize?: number
		status?: string
	}>
	newUploads: Array<{
		type: string
		altText?: string
		objectKey: string
		mimeType?: string
		fileSize?: number
		status: string
	}>
}

export async function processNoteMediaUploads(
	userId: string,
	noteId: string,
	organizationId: string,
	images: ImageFieldset[] = [],
	media: MediaFieldset[] = [],
): Promise<PreparedUploads> {
	const allUploads: UploadFieldset[] = [
		...images.map((img) => ({ ...img, type: 'image' })),
		...media.map((m) => ({
			...m,
			type: m.type || (m.file?.type?.startsWith('video/') ? 'video' : 'image'),
		})),
	]

	const uploadUpdates = await Promise.all(
		allUploads.filter(uploadHasId).map(async (upload) => {
			if (uploadHasFile(upload)) {
				const isVideo =
					upload.type === 'video' || upload.file?.type?.startsWith('video/')
				const objectKey = isVideo
					? await uploadNoteVideo(userId, noteId, upload.file, organizationId)
					: await uploadNoteImage(userId, noteId, upload.file, organizationId)

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
	)

	const newUploads = await Promise.all(
		allUploads
			.filter(uploadHasFile)
			.filter((upload) => !upload.id)
			.map(async (upload) => {
				const isVideo =
					upload.type === 'video' || upload.file?.type?.startsWith('video/')
				const objectKey = isVideo
					? await uploadNoteVideo(userId, noteId, upload.file, organizationId)
					: await uploadNoteImage(userId, noteId, upload.file, organizationId)

				return {
					type: isVideo ? 'video' : 'image',
					altText: upload.altText,
					objectKey,
					mimeType: upload.file?.type,
					fileSize: upload.file?.size,
					status: 'processing',
				}
			}),
	)

	return { uploadUpdates, newUploads }
}

export async function triggerMediaProcessingJobs(
	noteId: string,
	organizationId: string,
	userId: string,
	newUploads: Array<{ type: string; objectKey: string }>,
): Promise<void> {
	const newVideoUploads = newUploads.filter((upload) => upload.type === 'video')
	for (const video of newVideoUploads) {
		try {
			const [videoRecord] = await db
				.select({ id: OrganizationNoteUpload.id })
				.from(OrganizationNoteUpload)
				.where(
					and(
						eq(OrganizationNoteUpload.noteId, noteId),
						eq(OrganizationNoteUpload.objectKey, video.objectKey),
						eq(OrganizationNoteUpload.type, 'video'),
					),
				)
				.limit(1)

			if (videoRecord) {
				const { url: signedVideoUrl, headers: videoHeaders } =
					getSignedGetRequestInfo(video.objectKey)

				await triggerVideoProcessing({
					videoUrl: signedVideoUrl,
					videoHeaders,
					videoId: videoRecord.id,
					noteId,
					organizationId,
					userId,
				})
			}
		} catch (error) {
			console.error('Failed to trigger video processing:', error)
		}
	}

	const newImageUploads = newUploads.filter((upload) => upload.type === 'image')
	for (const image of newImageUploads) {
		try {
			const [imageRecord] = await db
				.select({ id: OrganizationNoteUpload.id })
				.from(OrganizationNoteUpload)
				.where(
					and(
						eq(OrganizationNoteUpload.noteId, noteId),
						eq(OrganizationNoteUpload.objectKey, image.objectKey),
						eq(OrganizationNoteUpload.type, 'image'),
					),
				)
				.limit(1)

			if (imageRecord) {
				const { url: signedImageUrl, headers: imageHeaders } =
					getSignedGetRequestInfo(image.objectKey)

				await triggerImageProcessing({
					imageUrl: signedImageUrl,
					imageHeaders,
					imageId: imageRecord.id,
					noteId,
					organizationId,
					userId,
				})
			}
		} catch (error) {
			console.error('Failed to trigger image processing:', error)
		}
	}
}
