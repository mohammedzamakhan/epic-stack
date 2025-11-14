// Simple JavaScript export for development
export type {
	StorageConfig,
	OrganizationS3Config,
	GetOrganizationConfigFn,
	DecryptFn,
} from './src/types'
export type { UploadOptions } from './src/upload-helpers'

export {
	createStorageClient,
	uploadToStorage,
	testS3Connection,
	getSignedGetRequestInfo,
	getSignedGetRequestInfoAsync,
} from './src/client'

export {
	uploadProfileImage,
	uploadOrganizationImage,
	uploadNoteImage,
	uploadCommentImage,
	uploadNoteVideo,
	uploadVideoThumbnail,
} from './src/upload-helpers'
