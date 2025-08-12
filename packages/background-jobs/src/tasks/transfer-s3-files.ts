import { task, logger } from '@trigger.dev/sdk/v3'
import {
	S3Client,
	ListObjectsV2Command,
	GetObjectCommand,
	PutObjectCommand,
	DeleteObjectCommand,
} from '@aws-sdk/client-s3'

export const transferS3Files = task({
	id: 'transfer-s3-files-cross-account',
	run: async (payload: {
		// Source configuration
		sourceBucket: string
		sourceCredentials: {
			accessKeyId: string
			secretAccessKey: string
			endpoint?: string // For S3-compatible services like R2, Tigris
			region?: string
		}

		// Destination configuration
		destinationBucket: string
		destinationCredentials: {
			accessKeyId: string
			secretAccessKey: string
			endpoint?: string // For S3-compatible services like R2, Tigris
			region?: string
		}

		// Transfer options
		prefix?: string
		maxFiles?: number
		deleteAfterTransfer?: boolean // Optional flag to control deletion
	}) => {
		const {
			sourceBucket,
			sourceCredentials,
			destinationBucket,
			destinationCredentials,
			prefix = '',
			maxFiles = 100,
			deleteAfterTransfer = true,
		} = payload

		// Source S3 client (supports AWS S3, R2, Tigris, etc.)
		const sourceS3Client = new S3Client({
			region: sourceCredentials.region || 'auto',
			endpoint: sourceCredentials.endpoint,
			credentials: {
				accessKeyId: sourceCredentials.accessKeyId,
				secretAccessKey: sourceCredentials.secretAccessKey,
			},
			forcePathStyle: !!sourceCredentials.endpoint,
		})

		// Destination S3 client (supports AWS S3, R2, Tigris, etc.)
		const destinationS3Client = new S3Client({
			region: destinationCredentials.region || 'auto',
			endpoint: destinationCredentials.endpoint,
			credentials: {
				accessKeyId: destinationCredentials.accessKeyId,
				secretAccessKey: destinationCredentials.secretAccessKey,
			},
			forcePathStyle: !!destinationCredentials.endpoint,
		})

		// List objects in source bucket
		const listCommand = new ListObjectsV2Command({
			Bucket: sourceBucket,
			Prefix: prefix,
			MaxKeys: maxFiles,
		})

		const listResponse = await sourceS3Client.send(listCommand)
		const objects = listResponse.Contents || []

		logger.info(`Found ${objects.length} objects to transfer`)

		const transferredFiles = []
		const deletedFiles = []

		// Transfer each file
		for (const object of objects) {
			if (!object.Key) continue

			try {
				// Get object from source bucket
				const getCommand = new GetObjectCommand({
					Bucket: sourceBucket,
					Key: object.Key,
				})

				const getResponse = await sourceS3Client.send(getCommand)

				if (!getResponse.Body) {
					logger.warn(`No body found for object: ${object.Key}`)
					continue
				}

				// Convert stream to buffer
				const chunks = []
				const reader = getResponse.Body.transformToWebStream().getReader()

				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					chunks.push(value)
				}

				const buffer = Buffer.concat(chunks)

				// Put object to destination bucket
				const putCommand = new PutObjectCommand({
					Bucket: destinationBucket,
					Key: object.Key,
					Body: buffer,
					ContentType: getResponse.ContentType,
					Metadata: getResponse.Metadata,
				})

				await destinationS3Client.send(putCommand)

				transferredFiles.push({
					key: object.Key,
					size: object.Size,
					status: 'success',
				})

				logger.info(`Successfully transferred: ${object.Key}`)

				// Delete from source bucket after successful transfer
				if (deleteAfterTransfer) {
					try {
						const deleteCommand = new DeleteObjectCommand({
							Bucket: sourceBucket,
							Key: object.Key,
						})

						await sourceS3Client.send(deleteCommand)

						deletedFiles.push({
							key: object.Key,
							status: 'deleted',
						})

						logger.info(`Successfully deleted from source: ${object.Key}`)
					} catch (deleteError: any) {
						logger.error(
							`Failed to delete ${object.Key} from source:`,
							deleteError,
						)
						deletedFiles.push({
							key: object.Key,
							status: 'delete_failed',
							error:
								deleteError instanceof Error
									? deleteError.message
									: 'Unknown error',
						})
					}
				}
			} catch (error: any) {
				logger.error(`Failed to transfer ${object.Key}:`, error)
				transferredFiles.push({
					key: object.Key,
					status: 'failed',
					error: error instanceof Error ? error.message : 'Unknown error',
				})
			}
		}

		return {
			totalFiles: objects.length,
			transferredCount: transferredFiles.filter((f) => f.status === 'success')
				.length,
			failedCount: transferredFiles.filter((f) => f.status === 'failed').length,
			deletedCount: deletedFiles.filter((f) => f.status === 'deleted').length,
			deleteFailedCount: deletedFiles.filter(
				(f) => f.status === 'delete_failed',
			).length,
			files: transferredFiles,
			deletions: deletedFiles,
		}
	},
})
