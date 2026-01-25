import { type FileUpload } from '@mjackson/form-data-parser'
import { decrypt, getSSOMasterKey } from '@repo/security'
import {
	createStorageClient,
	uploadProfileImage as _uploadProfileImage,
	type StorageConfig,
	type UploadOptions,
} from '@repo/storage'
import { prisma } from '@repo/database'
import { ENV } from 'varlock/env'

// Default storage configuration from environment variables
const DEFAULT_STORAGE_CONFIG: StorageConfig = {
	endpoint: ENV.AWS_ENDPOINT_URL_S3,
	bucket: ENV.BUCKET_NAME,
	accessKey: ENV.AWS_ACCESS_KEY_ID,
	secretKey: ENV.AWS_SECRET_ACCESS_KEY,
	region: ENV.AWS_REGION,
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
	return _uploadProfileImage(
		userId,
		file,
		createUploadOptions(),
		organizationId,
	)
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
