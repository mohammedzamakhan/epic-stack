import { logger, task } from '@trigger.dev/sdk/v3'
import ffmpeg from 'fluent-ffmpeg'
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

async function uploadVideoThumbnail(
	userId: string,
	noteId: string,
	videoId: string,
	thumbnailBuffer: Buffer,
	fileExtension: string = 'jpg',
	organizationId: string,
) {
	const fileId = createId()
	const timestamp = Date.now()
	const key = `orgs/${organizationId}/notes/${noteId}/videos/thumbnails/${timestamp}-${videoId}-${fileId}.${fileExtension}`

	// Upload thumbnail to storage

	const thumbnailFile = {
		type: fileExtension === 'svg' ? 'image/svg+xml' : 'image/jpeg',
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

	// Thumbnail uploaded successfully
	return key
}

export const videoProcessingTask = task({
	id: 'video-processing',
	run: async (payload: {
		videoUrl: string
		videoHeaders: Record<string, string>
		videoId: string
		noteId: string
		organizationId: string
		userId: string
	}) => {
		const { videoUrl, videoHeaders, videoId, noteId, organizationId, userId } =
			payload

		logger.info('Starting video processing', {
			videoId,
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
			`thumbnail_${videoId}_${Date.now()}.jpg`,
		)
		const tempVideoPath = path.join(
			tempDirectory,
			`video_${videoId}_${Date.now()}.mp4`,
		)

		try {
			// Update video upload status to processing
			await prisma.organizationNoteUpload.update({
				where: { id: videoId },
				data: { status: 'processing' },
			})

			// Real video processing for both development and production
			// MSW handles the mock storage in development mode

			// Fetch the video with the signed URL
			const response = await fetch(videoUrl, { headers: videoHeaders })

			if (!response.ok) {
				const errorText = await response.text()
				logger.error('Failed to fetch video', {
					status: response.status,
					statusText: response.statusText,
					videoId,
					error: errorText,
				})
				throw new Error(
					`Failed to fetch video: ${response.status} ${response.statusText}`,
				)
			}

			if (!response.body) {
				throw new Error('Failed to fetch video - no response body')
			}

			// Get video metadata
			const contentLength = response.headers.get('content-length')
			const contentType = response.headers.get('content-type')
			const fileSize = contentLength ? parseInt(contentLength) : null

			// Save video to temporary file first (FFmpeg works better with files than streams)
			const videoBuffer = Buffer.from(await response.arrayBuffer())
			await fs.writeFile(tempVideoPath, videoBuffer)

			console.log('Video saved to temp file', {
				tempVideoPath,
				size: videoBuffer.length,
			})

			// Get video metadata to determine dimensions
			const videoMetadata = await new Promise<{
				width: number
				height: number
			}>((resolve, reject) => {
				ffmpeg.ffprobe(tempVideoPath, (err, metadata) => {
					if (err) {
						reject(err)
						return
					}

					const videoStream = metadata.streams.find(
						(stream) => stream.codec_type === 'video',
					)
					if (!videoStream || !videoStream.width || !videoStream.height) {
						reject(new Error('Could not determine video dimensions'))
						return
					}

					resolve({
						width: videoStream.width,
						height: videoStream.height,
					})
				})
			})

			// Calculate thumbnail size maintaining aspect ratio (max width 400px)
			const maxWidth = 400
			const aspectRatio = videoMetadata.width / videoMetadata.height
			const thumbnailWidth = Math.min(maxWidth, videoMetadata.width)
			const thumbnailHeight = Math.round(thumbnailWidth / aspectRatio)
			const thumbnailSize = `${thumbnailWidth}x${thumbnailHeight}`

			logger.info('Processing video thumbnail', {
				videoId,
				originalSize: `${videoMetadata.width}x${videoMetadata.height}`,
				thumbnailSize,
			})

			// Generate thumbnail at 2 seconds mark using the temporary file
			await new Promise<void>((resolve, reject) => {
				ffmpeg(tempVideoPath)
					.screenshots({
						count: 1,
						folder: tempDirectory,
						filename: path.basename(thumbnailPath),
						size: thumbnailSize,
						timemarks: ['2'], // 2 seconds
					})
					.on('end', () => {
						resolve()
					})
					.on('error', (err) => {
						logger.error('Failed to generate thumbnail', {
							videoId,
							error: err.message,
							thumbnailSize,
						})
						reject(err)
					})
			})

			// Read the generated thumbnail
			const thumbnailBuffer = await fs.readFile(thumbnailPath)

			// Upload thumbnail using the existing storage system
			const thumbnailKey = await uploadVideoThumbnail(
				userId,
				noteId,
				videoId,
				thumbnailBuffer,
				'jpg',
				organizationId,
			)

			// Update video upload record with thumbnail and metadata
			await prisma.organizationNoteUpload.update({
				where: { id: videoId },
				data: {
					thumbnailKey,
					fileSize,
					mimeType: contentType,
					status: 'completed',
				},
			})

			// Clean up temporary files
			await fs.unlink(thumbnailPath)
			await fs.unlink(tempVideoPath)

			const result = {
				videoId,
				thumbnailKey,
				noteId,
				organizationId,
				fileSize,
				mimeType: contentType,
			}

			logger.info('Video processing completed successfully', {
				videoId,
				thumbnailKey,
				fileSize,
				mimeType: contentType,
			})

			return result
		} catch (error) {
			logger.error('Video processing failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				videoId,
				noteId,
				organizationId,
			})

			// Update video upload status to failed
			try {
				await prisma.organizationNoteUpload.update({
					where: { id: videoId },
					data: { status: 'failed' },
				})
			} catch (dbError) {
				logger.error('Failed to update video upload status to failed', {
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
				await fs.unlink(tempVideoPath)
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			throw error
		}
	},
})
