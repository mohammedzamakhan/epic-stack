#!/usr/bin/env npx tsx
/**
 * Cross-account S3 file transfer for BYO-storage onboarding.
 *
 * When an organization enables custom S3 storage, existing objects remain in
 * the platform bucket until migrated. This script copies objects from a source
 * bucket to a destination bucket.
 *
 * Future: promote to a Cloudflare Workflow when BYO-storage migration is built
 * into the product UI (resumable, retriable, long-running).
 *
 * Usage:
 *   npx tsx scripts/transfer-s3-files.ts \
 *     --source-bucket=old-bucket \
 *     --source-endpoint=https://<account-id>.r2.cloudflarestorage.com \
 *     --source-access-key=... \
 *     --source-secret-key=... \
 *     --dest-bucket=new-bucket \
 *     --dest-endpoint=https://s3.amazonaws.com \
 *     --dest-access-key=... \
 *     --dest-secret-key=... \
 *     [--prefix=orgs/acme/] \
 *     [--max-files=100] \
 *     [--keep-source]
 */

import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3'

function readArg(name: string) {
	const prefix = `--${name}=`
	const match = process.argv.find((arg) => arg.startsWith(prefix))
	return match?.slice(prefix.length)
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`)
}

function createClient(options: {
	endpoint?: string
	region?: string
	accessKeyId: string
	secretAccessKey: string
}) {
	return new S3Client({
		region: options.region || 'auto',
		endpoint: options.endpoint,
		credentials: {
			accessKeyId: options.accessKeyId,
			secretAccessKey: options.secretAccessKey,
		},
		forcePathStyle: Boolean(options.endpoint),
	})
}

async function main() {
	const sourceBucket = readArg('source-bucket')
	const sourceAccessKey = readArg('source-access-key')
	const sourceSecretKey = readArg('source-secret-key')
	const destBucket = readArg('dest-bucket')
	const destAccessKey = readArg('dest-access-key')
	const destSecretKey = readArg('dest-secret-key')

	if (
		!sourceBucket ||
		!sourceAccessKey ||
		!sourceSecretKey ||
		!destBucket ||
		!destAccessKey ||
		!destSecretKey
	) {
		throw new Error('Missing required bucket/credential arguments')
	}

	const prefix = readArg('prefix') ?? ''
	const maxFiles = Number.parseInt(readArg('max-files') ?? '100', 10)
	const deleteAfterTransfer = !hasFlag('keep-source')

	const sourceS3 = createClient({
		endpoint: readArg('source-endpoint'),
		region: readArg('source-region'),
		accessKeyId: sourceAccessKey,
		secretAccessKey: sourceSecretKey,
	})
	const destS3 = createClient({
		endpoint: readArg('dest-endpoint'),
		region: readArg('dest-region'),
		accessKeyId: destAccessKey,
		secretAccessKey: destSecretKey,
	})

	const listResponse = await sourceS3.send(
		new ListObjectsV2Command({
			Bucket: sourceBucket,
			Prefix: prefix,
			MaxKeys: maxFiles,
		}),
	)

	const objects = listResponse.Contents ?? []
	console.log(`Found ${objects.length} object(s) to transfer`)

	const transferredFiles = []

	for (const object of objects) {
		if (!object.Key) continue

		const getResponse = await sourceS3.send(
			new GetObjectCommand({
				Bucket: sourceBucket,
				Key: object.Key,
			}),
		)

		if (!getResponse.Body) {
			console.warn(`Skipping ${object.Key}: empty body`)
			continue
		}

		const buffer = Buffer.from(await getResponse.Body.transformToByteArray())

		await destS3.send(
			new PutObjectCommand({
				Bucket: destBucket,
				Key: object.Key,
				Body: buffer,
				ContentType: getResponse.ContentType,
				Metadata: getResponse.Metadata,
			}),
		)

		if (deleteAfterTransfer) {
			await sourceS3.send(
				new DeleteObjectCommand({
					Bucket: sourceBucket,
					Key: object.Key,
				}),
			)
		}

		transferredFiles.push(object.Key)
		console.log(`Transferred ${object.Key}`)
	}

	console.log(
		JSON.stringify(
			{
				totalFiles: objects.length,
				transferredCount: transferredFiles.length,
				deleteAfterTransfer,
			},
			null,
			2,
		),
	)
}

main().catch((error) => {
	console.error('S3 transfer failed', error)
	process.exit(1)
})
