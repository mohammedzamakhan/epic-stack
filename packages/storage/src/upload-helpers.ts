import { type FileUpload } from '@mjackson/form-data-parser'
import { createId } from '@paralleldrive/cuid2'
import { type StorageConfig } from './types'
import { uploadToStorage } from './client'

/**
 * Upload options for organization-specific storage
 */
export interface UploadOptions {
	getConfig: (organizationId?: string) => Promise<StorageConfig>
}

/**
 * Sanitize and extract file extension safely
 * Prevents path traversal attacks and validates the filename
 */
function sanitizeAndExtractExtension(filename: string): string {
	// Remove path separators to prevent path traversal
	const basename = filename.replace(/^.*[\\/]/, '')
	// Remove null bytes
	const cleaned = basename.replace(/\0/g, '')

	// Validate filename contains only safe characters
	if (!/^[\w\-. ]+$/.test(cleaned)) {
		throw new Error('Invalid filename characters')
	}

	// Extract extension
	const parts = cleaned.split('.')
	if (parts.length < 2) {
		return '' // No extension
	}

	const extension = parts[parts.length - 1]!.toLowerCase()

	// Validate extension against allowlist
	const allowedExtensions = [
		'jpg',
		'jpeg',
		'png',
		'gif',
		'webp',
		'svg',
		'mp4',
		'webm',
		'mov',
		'avi',
		'pdf',
		'txt',
	]

	if (!allowedExtensions.includes(extension)) {
		throw new Error(`File extension .${extension} is not allowed`)
	}

	return extension
}

/**
 * Upload a profile image for a user
 */
export async function uploadProfileImage(
	userId: string,
	file: File | FileUpload,
	options: UploadOptions,
	organizationId?: string,
) {
	const fileId = createId()
	const fileExtension = sanitizeAndExtractExtension(file.name)
	const timestamp = Date.now()
	const key = `users/${userId}/profile-images/${timestamp}-${fileId}.${fileExtension}`
	const config = await options.getConfig(organizationId)
	return uploadToStorage(file, key, config)
}

/**
 * Upload an organization logo image
 */
export async function uploadOrganizationImage(
	organizationId: string,
	file: File | FileUpload,
	options: UploadOptions,
) {
	const fileId = createId()
	const fileExtension = sanitizeAndExtractExtension(file.name)
	const timestamp = Date.now()
	const key = `org/${organizationId}/logo/${timestamp}-${fileId}.${fileExtension}`
	const config = await options.getConfig(organizationId)
	return uploadToStorage(file, key, config)
}

/**
 * Upload a note image
 */
export async function uploadNoteImage(
	userId: string,
	noteId: string,
	file: File | FileUpload,
	options: UploadOptions,
	organizationId?: string,
) {
	if (!organizationId) {
		throw new Error('organizationId is required for note uploads')
	}

	const fileId = createId()
	const fileExtension = sanitizeAndExtractExtension(file.name)
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/images/${timestamp}-${fileId}.${fileExtension}`
	const config = await options.getConfig(organizationId)
	return uploadToStorage(file, key, config)
}

/**
 * Upload a comment image
 */
export async function uploadCommentImage(
	userId: string,
	commentId: string,
	file: File | FileUpload,
	options: UploadOptions,
	organizationId?: string,
) {
	if (!organizationId) {
		throw new Error('organizationId is required for comment uploads')
	}

	const fileId = createId()
	const fileExtension = sanitizeAndExtractExtension(file.name)
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/comments/${commentId}/images/${timestamp}-${fileId}.${fileExtension}`
	const config = await options.getConfig(organizationId)
	return uploadToStorage(file, key, config)
}

/**
 * Upload a note video
 */
export async function uploadNoteVideo(
	userId: string,
	noteId: string,
	file: File | FileUpload,
	options: UploadOptions,
	organizationId?: string,
) {
	if (!organizationId) {
		throw new Error('organizationId is required for note video uploads')
	}

	const fileId = createId()
	const fileExtension = sanitizeAndExtractExtension(file.name)
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/videos/${timestamp}-${fileId}.${fileExtension}`
	const config = await options.getConfig(organizationId)
	return uploadToStorage(file, key, config)
}

/**
 * Upload a video thumbnail
 */
export async function uploadVideoThumbnail(
	userId: string,
	noteId: string,
	videoId: string,
	thumbnailBuffer: Buffer,
	options: UploadOptions,
	organizationId?: string,
) {
	if (!organizationId) {
		throw new Error('organizationId is required for video thumbnail uploads')
	}

	const fileId = createId()
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/videos/thumbnails/${timestamp}-${videoId}-${fileId}.jpg`

	// Create a File-like object from the buffer
	const thumbnailFile = new File(
		[new Uint8Array(thumbnailBuffer)],
		'thumbnail.jpg',
		{
			type: 'image/jpeg',
		},
	)

	const config = await options.getConfig(organizationId)
	return uploadToStorage(thumbnailFile, key, config)
}
