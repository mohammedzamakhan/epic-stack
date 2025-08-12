import { logger, task } from '@trigger.dev/sdk/v3'
import * as fs from 'fs/promises'
import fetch from 'node-fetch'
import * as os from 'os'
import * as path from 'path'
import { createId } from '@paralleldrive/cuid2'

// Set Prisma engine path for Trigger.dev
if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
	try {
		const path = require('path')
		const fs = require('fs')

		// Try multiple possible paths relative to current working directory
		const possiblePaths = [
			path.resolve(
				process.cwd(),
				'node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node',
			),
			path.resolve(
				process.cwd(),
				'../../node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node',
			),
			path.resolve(
				process.cwd(),
				'../../../node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node',
			),
			path.resolve(
				__dirname,
				'../../../../node_modules/.prisma/client/libquery_engine-darwin-arm64.dylib.node',
			),
		]

		for (const enginePath of possiblePaths) {
			if (fs.existsSync(enginePath)) {
				process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath
				break
			}
		}
	} catch (error) {
		// Fallback - let Prisma handle it
	}
}

import { prisma } from '@repo/prisma'

// Import MSW setup for development mode
import '../mocks/index'

// Storage utilities copied from the web app
import { createHash, createHmac } from 'crypto'

const STORAGE_ENDPOINT = process.env.AWS_ENDPOINT_URL_S3
const STORAGE_BUCKET = process.env.BUCKET_NAME
const STORAGE_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
const STORAGE_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY
const STORAGE_REGION = process.env.AWS_REGION

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

function getSignedPutRequestInfo(
	file: { type: string; name: string },
	key: string,
) {
	const url = `${STORAGE_ENDPOINT}/${STORAGE_BUCKET}/${key}`
	const endpoint = new URL(url)
	const uploadDate = new Date().toISOString()

	// Prepare date strings
	const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
	const dateStamp = amzDate.slice(0, 8)

	// Build headers array
	const headers = [
		`content-type:${file.type}`,
		`host:${endpoint.host}`,
		`x-amz-content-sha256:UNSIGNED-PAYLOAD`,
		`x-amz-date:${amzDate}`,
		`x-amz-meta-upload-date:${uploadDate}`,
	]

	const canonicalHeaders = headers.join('\n') + '\n'
	const signedHeaders = headers.map((h) => h.split(':')[0]).join(';')

	const canonicalRequest = [
		'PUT',
		`/${STORAGE_BUCKET}/${key}`,
		'', // canonicalQueryString
		canonicalHeaders,
		signedHeaders,
		'UNSIGNED-PAYLOAD',
	].join('\n')

	// Prepare string to sign
	const algorithm = 'AWS4-HMAC-SHA256'
	const credentialScope = `${dateStamp}/${STORAGE_REGION}/s3/aws4_request`
	const stringToSign = [
		algorithm,
		amzDate,
		credentialScope,
		sha256(canonicalRequest),
	].join('\n')

	// Calculate signature
	const signingKey = getSignatureKey(
		STORAGE_SECRET_KEY!,
		dateStamp,
		STORAGE_REGION!,
		's3',
	)
	const signature = createHmac('sha256', signingKey)
		.update(stringToSign)
		.digest('hex')

	return {
		url,
		headers: {
			'X-Amz-Date': amzDate,
			'X-Amz-Content-SHA256': 'UNSIGNED-PAYLOAD',
			'Content-Type': file.type,
			'X-Amz-Meta-Upload-Date': uploadDate,
			Authorization: [
				`${algorithm} Credential=${STORAGE_ACCESS_KEY}/${credentialScope}`,
				`SignedHeaders=${signedHeaders}`,
				`Signature=${signature}`,
			].join(', '),
		},
	}
}

async function uploadImageThumbnail(
	userId: string,
	noteId: string,
	imageId: string,
	thumbnailBuffer: Buffer,
	fileExtension: string = 'jpg',
	organizationId: string,
) {
	const fileId = createId()
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/images/thumbnails/${timestamp}-${imageId}-${fileId}.${fileExtension}`

	const thumbnailFile = {
		type: 'image/jpeg',
		name: `thumbnail.${fileExtension}`,
	}

	const { url, headers } = getSignedPutRequestInfo(thumbnailFile, key)

	const uploadResponse = await fetch(url, {
		method: 'PUT',
		headers,
		body: thumbnailBuffer,
	})

	if (!uploadResponse.ok) {
		const errorMessage = `Failed to upload thumbnail to storage. Server responded with ${uploadResponse.status}: ${uploadResponse.statusText}`
		throw new Error(`Failed to upload thumbnail: ${errorMessage}`)
	}

	return key
}

function calculateThumbnailDimensions(
	originalWidth: number,
	originalHeight: number,
	maxWidth: number = 400,
) {
	const aspectRatio = originalWidth / originalHeight
	const thumbnailWidth = Math.min(maxWidth, originalWidth)
	const thumbnailHeight = Math.round(thumbnailWidth / aspectRatio)
	return { width: thumbnailWidth, height: thumbnailHeight }
}

export const imageProcessingTask = task({
	id: 'image-processing',
	run: async (payload: {
		imageUrl: string
		imageHeaders: Record<string, string>
		imageId: string
		noteId: string
		organizationId: string
		userId: string
	}) => {
		const { imageUrl, imageHeaders, imageId, noteId, organizationId, userId } =
			payload

		logger.info('Starting image processing', {
			imageId,
			noteId,
			organizationId,
			userId,
		})

		// Ensure MSW is set up before making any requests
		await import('../mocks/index')

		// Declare temp file paths at function scope for cleanup
		const tempDirectory = os.tmpdir()
		const thumbnailPath = path.join(
			tempDirectory,
			`thumbnail_${imageId}_${Date.now()}.jpg`,
		)
		const tempImagePath = path.join(
			tempDirectory,
			`image_${imageId}_${Date.now()}`,
		)

		try {
			// Update image upload status to processing
			await prisma.organizationNoteUpload.update({
				where: { id: imageId },
				data: { status: 'processing' },
			})

			// Fetch the image with the signed URL
			const response = await fetch(imageUrl, { headers: imageHeaders })

			if (!response.ok) {
				const errorText = await response.text()
				logger.error('Failed to fetch image', {
					status: response.status,
					statusText: response.statusText,
					imageId,
					error: errorText,
				})
				throw new Error(
					`Failed to fetch image: ${response.status} ${response.statusText}`,
				)
			}

			if (!response.body) {
				throw new Error('Failed to fetch image - no response body')
			}

			// Get image metadata
			const contentLength = response.headers.get('content-length')
			const contentType = response.headers.get('content-type')
			const fileSize = contentLength ? parseInt(contentLength) : null

			// Save image to temporary file first
			const imageBuffer = Buffer.from(await response.arrayBuffer())

			if (!imageBuffer || imageBuffer.length === 0) {
				throw new Error('Received empty image buffer')
			}

			// Validate that we have a proper image buffer

			const fileExtension = contentType?.split('/')[1] || 'jpg'
			const tempImagePathWithExt = `${tempImagePath}.${fileExtension}`
			await fs.writeFile(tempImagePathWithExt, imageBuffer)

			// Load image using Jimp to get dimensions and create thumbnail

			let metadata:
				| { width?: number; height?: number; format?: string }
				| undefined
			let jimp: any

			try {
				jimp = (await import('jimp')).default
				const jimpImage = await jimp.read(imageBuffer)
				metadata = {
					width: jimpImage.getWidth(),
					height: jimpImage.getHeight(),
					format: contentType?.split('/')[1] || 'jpeg',
				}
				logger.info('Image metadata loaded', {
					width: metadata?.width,
					height: metadata?.height,
				})
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error)
				logger.error('Jimp failed, using fallback', {
					error: errorMessage,
					bufferSize: imageBuffer.length,
					contentType,
				})

				// Fallback: use default dimensions
				metadata = {
					width: 800,
					height: 600,
					format: contentType?.split('/')[1] || 'jpeg',
				}
				logger.warn('Using fallback metadata', metadata)
			}

			const originalWidth = metadata?.width || 800
			const originalHeight = metadata?.height || 600

			// Calculate thumbnail dimensions maintaining aspect ratio (max width 400px)
			const { width: thumbnailWidth, height: thumbnailHeight } =
				calculateThumbnailDimensions(originalWidth, originalHeight, 400)

			logger.info('Generating thumbnail', {
				originalSize: `${originalWidth}x${originalHeight}`,
				thumbnailSize: `${thumbnailWidth}x${thumbnailHeight}`,
			})

			// Create thumbnail using Jimp
			let thumbnailBuffer: Buffer | undefined

			try {
				if (!jimp) {
					jimp = (await import('jimp')).default
				}

				const jimpImage = await jimp.read(imageBuffer)
				const resizedImage = jimpImage.resize(thumbnailWidth, thumbnailHeight)
				thumbnailBuffer = await resizedImage
					.quality(80)
					.getBufferAsync(jimp.MIME_JPEG)
				logger.info('Thumbnail generated successfully')
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error)
				logger.error('Jimp thumbnail creation failed, using original image', {
					error: errorMessage,
					thumbnailWidth,
					thumbnailHeight,
				})

				// Fallback: use original image as thumbnail
				thumbnailBuffer = imageBuffer
				logger.warn('Using original image as thumbnail')
			}

			// Ensure we have a thumbnail buffer
			if (!thumbnailBuffer) {
				thumbnailBuffer = imageBuffer
				logger.warn('No thumbnail generated, using original image')
			}

			// Save thumbnail to temp file for verification (optional)
			await fs.writeFile(thumbnailPath, thumbnailBuffer)

			// Upload thumbnail using the existing storage system
			const thumbnailKey = await uploadImageThumbnail(
				userId,
				noteId,
				imageId,
				thumbnailBuffer,
				'jpg',
				organizationId,
			)

			// Update image upload record with thumbnail and metadata
			await prisma.organizationNoteUpload.update({
				where: { id: imageId },
				data: {
					thumbnailKey,
					fileSize,
					mimeType: contentType,
					status: 'completed',
				},
			})

			// Clean up temporary files
			await fs.unlink(thumbnailPath)
			await fs.unlink(tempImagePathWithExt)

			const result = {
				imageId,
				thumbnailKey,
				noteId,
				organizationId,
				fileSize,
				mimeType: contentType,
				originalDimensions: { width: originalWidth, height: originalHeight },
				thumbnailDimensions: { width: thumbnailWidth, height: thumbnailHeight },
			}

			logger.info('Image processing completed', {
				thumbnailKey,
				originalSize: `${originalWidth}x${originalHeight}`,
				thumbnailSize: `${thumbnailWidth}x${thumbnailHeight}`,
			})

			return result
		} catch (error) {
			logger.error('Image processing failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				imageId,
				noteId,
				organizationId,
			})

			// Update image upload status to failed
			try {
				await prisma.organizationNoteUpload.update({
					where: { id: imageId },
					data: { status: 'failed' },
				})
			} catch (dbError) {
				logger.error('Failed to update image upload status to failed', {
					dbError,
				})
			}

			// Clean up temporary files on error
			try {
				await fs.unlink(thumbnailPath)
			} catch (cleanupError) {
				// Ignore cleanup errors
			}
			try {
				await fs.unlink(`${tempImagePath}.jpg`)
				await fs.unlink(`${tempImagePath}.png`)
				await fs.unlink(`${tempImagePath}.gif`)
				await fs.unlink(`${tempImagePath}.webp`)
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			throw error
		}
	},
})
