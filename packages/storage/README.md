# @repo/storage

A reusable storage package for S3-compatible storage solutions (Tigris, AWS S3, etc.).

## Features

- **S3-Compatible**: Works with Tigris, AWS S3, and other S3-compatible storage solutions
- **AWS Signature V4**: Implements AWS Signature Version 4 signing for secure requests
- **Organization-Specific Storage**: Supports multi-tenant storage configurations
- **Type-Safe**: Written in TypeScript with full type definitions
- **Upload Helpers**: Pre-built helpers for common upload scenarios (profile images, organization logos, etc.)

## Installation

This package is part of the monorepo and is automatically available to other packages.

```bash
npm install @repo/storage
```

## Usage

### Basic Setup

```typescript
import { createStorageClient } from '@repo/storage'

// Create a storage client with default configuration
const storageClient = createStorageClient({
	endpoint: process.env.AWS_ENDPOINT_URL_S3,
	bucket: process.env.BUCKET_NAME,
	accessKey: process.env.AWS_ACCESS_KEY_ID,
	secretKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
})

// Upload a file
await storageClient.upload(file, 'path/to/file.jpg')

// Get a signed URL for downloading
const { url, headers } = await storageClient.getSignedGetUrl('path/to/file.jpg')

// Test connection
const result = await storageClient.testConnection()
console.log(result.success ? 'Connected!' : result.message)
```

### Organization-Specific Storage

```typescript
import { createStorageClient } from '@repo/storage'
import { prisma } from '@repo/prisma'
import { decrypt, getSSOMasterKey } from './encryption'

const storageClient = createStorageClient({
	endpoint: process.env.AWS_ENDPOINT_URL_S3,
	bucket: process.env.BUCKET_NAME,
	accessKey: process.env.AWS_ACCESS_KEY_ID,
	secretKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION,
})

// Upload with organization-specific config
await storageClient.upload(
	file,
	'path/to/file.jpg',
	'org-123', // organizationId
	{
		getOrganizationConfig: async (orgId) => {
			return await prisma.organizationS3Config.findUnique({
				where: { organizationId: orgId },
			})
		},
		decrypt: (encrypted) => decrypt(encrypted, getSSOMasterKey()),
	},
)
```

### Upload Helpers

```typescript
import {
	uploadProfileImage,
	uploadOrganizationImage,
	uploadNoteImage,
} from '@repo/storage'

// Upload a profile image
const key = await uploadProfileImage(
	userId,
	file,
	{
		getConfig: async (orgId) => {
			// Return storage config for the organization
			return storageClient.getConfig(orgId, options)
		},
	},
	organizationId,
)

// Upload an organization logo
const logoKey = await uploadOrganizationImage(organizationId, file, {
	getConfig: async (orgId) => storageClient.getConfig(orgId, options),
})
```

## API Reference

### `createStorageClient(defaultConfig: StorageConfig)`

Creates a storage client with default configuration.

### `StorageConfig`

```typescript
interface StorageConfig {
	endpoint: string // S3 endpoint URL
	bucket: string // Bucket name
	accessKey: string // Access key ID
	secretKey: string // Secret access key
	region: string // AWS region
}
```

### Client Methods

- `upload(file, key, organizationId?, options?)` - Upload a file
- `getSignedGetUrl(key, organizationId?, options?)` - Get a signed URL for downloading
- `testConnection(organizationId?, options?)` - Test the storage connection
- `getConfig(organizationId?, options?)` - Get storage configuration

### Upload Helpers

- `uploadProfileImage(userId, file, options, organizationId?)`
- `uploadOrganizationImage(organizationId, file, options)`
- `uploadNoteImage(userId, noteId, file, options, organizationId?)`
- `uploadCommentImage(userId, commentId, file, options, organizationId?)`
- `uploadNoteVideo(userId, noteId, file, options, organizationId?)`
- `uploadVideoThumbnail(userId, noteId, videoId, buffer, options, organizationId?)`

## Environment Variables

```env
AWS_ENDPOINT_URL_S3=https://fly.storage.tigris.dev
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=auto
BUCKET_NAME=your_bucket_name
```

## License

MIT
