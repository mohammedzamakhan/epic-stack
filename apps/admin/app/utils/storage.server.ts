import { createHash, createHmac } from 'crypto'
import { type FileUpload } from '@mjackson/form-data-parser'
import { createId } from '@paralleldrive/cuid2'
import { prisma } from './db.server'
import { decrypt, getSSOMasterKey } from '@repo/security'

// Default storage configuration from environment variables
const DEFAULT_STORAGE_ENDPOINT = process.env.AWS_ENDPOINT_URL_S3
const DEFAULT_STORAGE_BUCKET = process.env.BUCKET_NAME
const DEFAULT_STORAGE_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
const DEFAULT_STORAGE_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY
const DEFAULT_STORAGE_REGION = process.env.AWS_REGION

// Interface for storage configuration
interface StorageConfig {
	endpoint: string
	bucket: string
	accessKey: string
	secretKey: string
	region: string
}

// Get storage configuration for an organization
async function getStorageConfig(
	organizationId?: string,
): Promise<StorageConfig> {
	// If organization ID is provided, check for custom S3 configuration
	if (organizationId) {
		const s3Config = await prisma.organizationS3Config.findUnique({
			where: { organizationId },
		})

		// If organization has S3 enabled and all required fields, use custom config
		if (s3Config?.isEnabled) {
			return {
				endpoint: s3Config.endpoint,
				bucket: s3Config.bucketName,
				accessKey: s3Config.accessKeyId,
				secretKey: decrypt(s3Config.secretAccessKey, getSSOMasterKey()), // Decrypt the secret key
				region: s3Config.region,
			}
		}
	}

	// Fall back to default configuration
	return {
		endpoint: DEFAULT_STORAGE_ENDPOINT!,
		bucket: DEFAULT_STORAGE_BUCKET!,
		accessKey: DEFAULT_STORAGE_ACCESS_KEY!,
		secretKey: DEFAULT_STORAGE_SECRET_KEY!,
		region: DEFAULT_STORAGE_REGION!,
	}
}

async function uploadToStorage(
	file: File | FileUpload,
	key: string,
	organizationId?: string,
) {
	const config = await getStorageConfig(organizationId)
	const { url, headers } = getSignedPutRequestInfo(file, key, config)

	const uploadResponse = await fetch(url, {
		method: 'PUT',
		headers,
		body: file instanceof File ? file : file.stream(),
	})

	if (!uploadResponse.ok) {
		const errorMessage = `Failed to upload file to storage. Server responded with ${uploadResponse.status}: ${uploadResponse.statusText}`
		console.error(errorMessage)
		throw new Error(`Failed to upload object: ${key}`)
	}

	return key
}

export async function uploadProfileImage(
	userId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `users/${userId}/profile-images/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key, organizationId)
}

export async function uploadOrganizationImage(
	organizationId: string,
	file: File | FileUpload,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `org/${organizationId}/logo/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key, organizationId)
}

export async function uploadNoteImage(
	userId: string,
	noteId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/images/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key, organizationId)
}

export async function uploadCommentImage(
	userId: string,
	commentId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/comments/${commentId}/images/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key, organizationId)
}

export async function uploadNoteVideo(
	userId: string,
	noteId: string,
	file: File | FileUpload,
	organizationId?: string,
) {
	const fileId = createId()
	const fileExtension = file.name.split('.').pop() || ''
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/videos/${timestamp}-${fileId}.${fileExtension}`
	return uploadToStorage(file, key, organizationId)
}

export async function uploadVideoThumbnail(
	userId: string,
	noteId: string,
	videoId: string,
	thumbnailBuffer: Buffer,
	organizationId?: string,
) {
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

	return uploadToStorage(thumbnailFile, key, organizationId)
}

function hmacSha256(key: string | Buffer, message: string) {
	const hmac = createHmac('sha256', key)
	hmac.update(message)
	return hmac.digest()
}

function sha256(message: string) {
	const hash = createHash('sha256')
	hash.update(message)
	return hash.digest('hex')
}

function getSignatureKey(
	key: string,
	dateStamp: string,
	regionName: string,
	serviceName: string,
) {
	const kDate = hmacSha256(`AWS4${key}`, dateStamp)
	const kRegion = hmacSha256(kDate, regionName)
	const kService = hmacSha256(kRegion, serviceName)
	const kSigning = hmacSha256(kService, 'aws4_request')
	return kSigning
}

function getBaseSignedRequestInfo({
	method,
	key,
	contentType,
	uploadDate,
	config,
}: {
	method: 'GET' | 'PUT'
	key: string
	contentType?: string
	uploadDate?: string
	config: StorageConfig
}) {
	const url = `${config.endpoint}/${config.bucket}/${key}`
	const endpoint = new URL(url)

	// Prepare date strings
	const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
	const dateStamp = amzDate.slice(0, 8)

	// Build headers array conditionally
	const headers = [
		...(contentType ? [`content-type:${contentType}`] : []),
		`host:${endpoint.host}`,
		`x-amz-content-sha256:UNSIGNED-PAYLOAD`,
		`x-amz-date:${amzDate}`,
		...(uploadDate ? [`x-amz-meta-upload-date:${uploadDate}`] : []),
	]

	const canonicalHeaders = headers.join('\n') + '\n'
	const signedHeaders = headers.map((h) => h.split(':')[0]).join(';')

	const canonicalRequest = [
		method,
		`/${config.bucket}/${key}`,
		'', // canonicalQueryString
		canonicalHeaders,
		signedHeaders,
		'UNSIGNED-PAYLOAD',
	].join('\n')

	// Prepare string to sign
	const algorithm = 'AWS4-HMAC-SHA256'
	const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`
	const stringToSign = [
		algorithm,
		amzDate,
		credentialScope,
		sha256(canonicalRequest),
	].join('\n')

	// Calculate signature
	const signingKey = getSignatureKey(
		config.secretKey,
		dateStamp,
		config.region,
		's3',
	)
	const signature = createHmac('sha256', signingKey)
		.update(stringToSign)
		.digest('hex')

	const baseHeaders = {
		'X-Amz-Date': amzDate,
		'X-Amz-Content-SHA256': 'UNSIGNED-PAYLOAD',
		Authorization: [
			`${algorithm} Credential=${config.accessKey}/${credentialScope}`,
			`SignedHeaders=${signedHeaders}`,
			`Signature=${signature}`,
		].join(', '),
	}

	return { url, baseHeaders }
}

function getSignedPutRequestInfo(
	file: File | FileUpload,
	key: string,
	config: StorageConfig,
) {
	const uploadDate = new Date().toISOString()
	const { url, baseHeaders } = getBaseSignedRequestInfo({
		method: 'PUT',
		key,
		contentType: file.type,
		uploadDate,
		config,
	})

	return {
		url,
		headers: {
			...baseHeaders,
			'Content-Type': file.type,
			'X-Amz-Meta-Upload-Date': uploadDate,
		},
	}
}

export function getSignedGetRequestInfo(key: string, _organizationId?: string) {
	// For GET requests, we need to handle async config retrieval differently
	// This function should be updated to be async or handle the config differently
	const config = {
		endpoint: DEFAULT_STORAGE_ENDPOINT!,
		bucket: DEFAULT_STORAGE_BUCKET!,
		accessKey: DEFAULT_STORAGE_ACCESS_KEY!,
		secretKey: DEFAULT_STORAGE_SECRET_KEY!,
		region: DEFAULT_STORAGE_REGION!,
	}

	const { url, baseHeaders } = getBaseSignedRequestInfo({
		method: 'GET',
		key,
		config,
	})

	return {
		url,
		headers: baseHeaders,
	}
}

// Add a new async function for getting signed GET URLs with org-specific config
export async function getSignedGetRequestInfoAsync(
	key: string,
	organizationId?: string,
) {
	const config = await getStorageConfig(organizationId)
	const { url, baseHeaders } = getBaseSignedRequestInfo({
		method: 'GET',
		key,
		config,
	})

	return {
		url,
		headers: baseHeaders,
	}
}

// Add S3 connection test function
export async function testS3Connection(
	config: StorageConfig,
): Promise<{ success: boolean; message?: string }> {
	try {
		// Test connection by trying to list objects in the bucket
		const testKey = `test-connection-${Date.now()}.txt`
		const testFile = new File(['test'], 'test.txt', { type: 'text/plain' })

		const { url, headers } = getSignedPutRequestInfo(testFile, testKey, config)

		const response = await fetch(url, {
			method: 'PUT',
			headers,
			body: testFile,
		})

		if (response.ok) {
			// Try to delete the test file
			try {
				const deleteUrl = `${config.endpoint}/${config.bucket}/${testKey}`
				await fetch(deleteUrl, { method: 'DELETE' })
			} catch {
				// Ignore delete errors
			}

			return {
				success: true,
				message:
					'Successfully connected to S3 bucket and verified write permissions.',
			}
		} else {
			return {
				success: false,
				message: `Failed to upload test file: ${response.status} ${response.statusText}`,
			}
		}
	} catch (error) {
		return {
			success: false,
			message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
		}
	}
}
