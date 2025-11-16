import { type FileUpload } from '@mjackson/form-data-parser'
import {
	createStorageClient,
	uploadProfileImage as _uploadProfileImage,
	uploadOrganizationImage as _uploadOrganizationImage,
	uploadNoteImage as _uploadNoteImage,
	uploadCommentImage as _uploadCommentImage,
	uploadNoteVideo as _uploadNoteVideo,
	uploadVideoThumbnail as _uploadVideoThumbnail,
	getSignedGetRequestInfo as _getSignedGetRequestInfo,
	testS3Connection as _testS3Connection,
	type StorageConfig,
	type UploadOptions,
} from '@repo/storage'
import { prisma } from './db.server'
import { decrypt, getSSOMasterKey } from '@repo/security'

// Validate required environment variables
const requiredEnvVars = [
	'AWS_ENDPOINT_URL_S3',
	'BUCKET_NAME',
	'AWS_ACCESS_KEY_ID',
	'AWS_SECRET_ACCESS_KEY',
	'AWS_REGION',
] as const

for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		throw new Error(`Missing required environment variable: ${envVar}`)
	}
}

// Default storage configuration from environment variables
const DEFAULT_STORAGE_CONFIG: StorageConfig = {
	endpoint: process.env.AWS_ENDPOINT_URL_S3!,
	bucket: process.env.BUCKET_NAME!,
	accessKey: process.env.AWS_ACCESS_KEY_ID!,
	secretKey: process.env.AWS_SECRET_ACCESS_KEY!,
	region: process.env.AWS_REGION!,
}

// Create the storage client
const storageClient = createStorageClient(DEFAULT_STORAGE_CONFIG)

// Create upload options with app-specific configuration
function createUploadOptions(): UploadOptions {
	return {
		getConfig: async (organizationId?: string) => {
			return await storageClient.getConfig(organizationId, {
				getOrganizationConfig: async (orgId) => {
					return await prisma.organizationS3Config.findUnique({
						where: { organizationId: orgId },
					})
				},
				decrypt: (encrypted) => decrypt(encrypted, getSSOMasterKey()),
			})
		},
	}
}

// Export upload functions with app-specific configuration
export async function uploadProfileImage(
	userId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	return _uploadProfileImage(userId, file, createUploadOptions(), organizationId)
}

export async function uploadOrganizationImage(
	organizationId: string,
	file: File | FileUpload,
) {
	return _uploadOrganizationImage(organizationId, file, createUploadOptions())
}

export async function uploadNoteImage(
	userId: string,
	noteId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	return _uploadNoteImage(
		userId,
		noteId,
		file,
		createUploadOptions(),
		organizationId,
	)
}

export async function uploadCommentImage(
	userId: string,
	commentId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	return _uploadCommentImage(
		userId,
		commentId,
		file,
		createUploadOptions(),
		organizationId,
	)
}

export async function uploadNoteVideo(
	userId: string,
	noteId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	return _uploadNoteVideo(
		userId,
		noteId,
		file,
		createUploadOptions(),
		organizationId,
	)
}

export async function uploadVideoThumbnail(
	userId: string,
	noteId: string,
	videoId: string,
	thumbnailBuffer: Buffer,
	organizationId?: string,
) {
	return _uploadVideoThumbnail(
		userId,
		noteId,
		videoId,
		thumbnailBuffer,
		createUploadOptions(),
		organizationId,
	)
}

// Export client functions
export function getSignedGetRequestInfo(key: string, _organizationId?: string) {
	// For synchronous calls, use default config only
	return _getSignedGetRequestInfo(key, DEFAULT_STORAGE_CONFIG)
}

export async function getSignedGetRequestInfoAsync(
	key: string,
	organizationId?: string,
) {
	const { url, headers } = await storageClient.getSignedGetUrl(
		key,
		organizationId,
		{
			getOrganizationConfig: async (orgId) => {
				return await prisma.organizationS3Config.findUnique({
					where: { organizationId: orgId },
				})
			},
			decrypt: (encrypted) => decrypt(encrypted, getSSOMasterKey()),
		},
	)
	return { url, headers }
}

export async function testS3Connection(config: StorageConfig) {
	return _testS3Connection(config)
}

// Re-export types
export type { StorageConfig }
