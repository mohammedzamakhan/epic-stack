// Export types
export type {
	StorageConfig,
	OrganizationS3Config,
	GetOrganizationConfigFn,
	DecryptFn,
} from './types'
export type { UploadOptions } from './upload-helpers'

// Export client functions
export {
	createStorageClient,
	uploadToStorage,
	testS3Connection,
	getSignedGetRequestInfo,
	getSignedGetRequestInfoAsync,
} from './client'

// Export upload helpers
export {
	uploadProfileImage,
	uploadOrganizationImage,
	uploadNoteImage,
	uploadCommentImage,
	uploadNoteVideo,
	uploadVideoThumbnail,
} from './upload-helpers'
