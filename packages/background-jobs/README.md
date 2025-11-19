# Background Jobs Package

This package handles background job processing using Trigger.dev, specifically
for video processing tasks.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Add these environment variables to your `.env` file:

```bash
# Trigger.dev Configuration
TRIGGER_PROJECT_ID=your-trigger-project-id
TRIGGER_SECRET_KEY=your-trigger-secret-key

# Note: Video storage uses the existing Tigris/S3-compatible storage system
# configured via AWS_ENDPOINT_URL_S3, BUCKET_NAME, etc.
```

### 3. Initialize Trigger.dev

Run the Trigger.dev CLI to set up your project:

```bash
npx trigger.dev@latest init
```

### 4. Start Development Server

Run the Trigger.dev development server:

```bash
npx trigger.dev@latest dev
```

## Features

### Video Processing

The package includes a video processing task that:

1. **Fetches videos** from provided URLs
2. **Generates thumbnails** at the 2-second mark using FFmpeg
3. **Uploads thumbnails** to S3 storage
4. **Updates database records** with processing status and metadata
5. **Handles errors** gracefully with proper status updates

### Usage

```typescript
import { triggerVideoProcessing } from '@repo/background-jobs'

// Trigger video processing (upload function is handled internally)
const handle = await triggerVideoProcessing({
	videoUrl: 'https://example.com/video.mp4',
	videoId: 'video-database-id',
	noteId: 'note-database-id',
	organizationId: 'org-database-id',
	userId: 'user-id',
})
```

## Database Schema

The package expects these database models:

```prisma
model OrganizationNoteVideo {
  id           String           @id @default(cuid())
  altText      String?
  objectKey    String
  thumbnailKey String?
  duration     Int?
  fileSize     Int?
  mimeType     String?
  status       String           @default("processing") // processing, completed, failed
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  noteId       String
  note         OrganizationNote @relation(fields: [noteId], references: [id], onDelete: Cascade)

  @@index([noteId])
  @@index([status])
}
```

## Deployment

### Manual Deployment

```bash
npx trigger.dev@latest deploy
```

### GitHub Actions

Set up automatic deployment using GitHub Actions by following the
[Trigger.dev GitHub Actions guide](https://trigger.dev/docs/github-actions).

## Troubleshooting

### FFmpeg Issues

Make sure FFmpeg is installed on your system and available in the PATH. The
package uses the `ffmpeg` build extension which should handle this automatically
in deployed environments.

### Storage Permissions

The package uses the existing Tigris/S3-compatible storage system. Ensure your
storage credentials have the necessary permissions for uploading and reading
files.

### Database Connection

The package uses `@repo/database` directly for database access and handles
thumbnail uploads internally using the same storage system as your app.
