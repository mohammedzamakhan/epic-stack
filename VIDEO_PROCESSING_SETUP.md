# Video Processing Setup Guide

This guide will help you set up video processing with Trigger.dev for your
organization notes app.

## Overview

The video processing feature allows users to:

- Upload videos to organization notes
- Automatically generate thumbnails using FFmpeg
- Display video thumbnails in the notes list
- Show processing status for uploaded videos

## Prerequisites

1. **Trigger.dev Account**: Create an account at
   [cloud.trigger.dev](https://cloud.trigger.dev)
2. **AWS S3 Bucket**: For storing videos and thumbnails
3. **FFmpeg**: Will be automatically installed via the build extension

## Setup Steps

### 1. Install Dependencies

```bash
# Install the background-jobs package dependencies
cd packages/background-jobs
npm install

# Install dependencies for the web app
cd ../../apps/web
npm install
```

### 2. Environment Variables

Add these variables to your `.env` file:

```bash
# Trigger.dev Configuration
TRIGGER_PROJECT_ID="your-trigger-project-id"
TRIGGER_SECRET_KEY="your-trigger-secret-key"

# Note: Video storage uses the existing Tigris/S3-compatible storage
# No additional AWS configuration needed beyond what's already set up
```

### 3. Database Migration

The database migration has already been created. Run it:

```bash
npm run db:migrate:dev
```

### 4. Initialize Trigger.dev

```bash
# This should already be done, but if needed:
npx trigger.dev@latest init
```

### 5. Start Development Servers

In separate terminals:

```bash
# Terminal 1: Start your web app
npm run dev:web

# Terminal 2: Start Trigger.dev development server
npx trigger.dev@latest dev
```

## How It Works

### 1. Video Upload Flow

1. User uploads a video file in the note editor
2. Video is uploaded to S3 storage
3. Database record is created with `status: "processing"`
4. Background job is triggered for video processing

### 2. Video Processing Flow

1. **Fetch Video**: Downloads video from S3 URL
2. **Generate Thumbnail**: Uses FFmpeg to create thumbnail at 2-second mark
3. **Upload Thumbnail**: Saves thumbnail to S3
4. **Update Database**: Updates video record with thumbnail info and
   `status: "completed"`

### 3. Display Flow

1. Notes list shows video thumbnails when available
2. Video icon overlay indicates it's a video
3. Processing status is shown while thumbnail is being generated
4. Failed processing shows error indicator

## File Structure

```
packages/background-jobs/
├── src/
│   ├── index.ts                    # Package exports
│   ├── client.ts                   # Client functions
│   └── tasks/
│       └── video-processing.ts     # Main video processing task
├── package.json
├── tsconfig.json
└── README.md

trigger/
├── example.ts                      # Example task for testing
└── video-processing.ts             # Video processing task export

apps/web/app/
├── components/ui/
│   └── multi-media-upload.tsx      # New component for image/video upload
├── routes/_app+/$orgSlug_+/
│   ├── __org-note-editor.tsx       # Updated with video support
│   ├── __org-note-editor.server.tsx # Updated with video processing
│   ├── notes.tsx                   # Updated loader with video data
│   ├── notes.$noteId_.edit.tsx     # Updated loader with video data
│   └── notes-cards.tsx             # Updated to show video thumbnails
```

## Testing

### 1. Test the Example Task

Visit the Trigger.dev dashboard test page and run the "hello-world" task with:

```json
{
	"name": "Test User"
}
```

### 2. Test Video Upload

1. Create or edit a note
2. Upload a video file (MP4, MOV, etc.)
3. Save the note
4. Check the Trigger.dev dashboard for the video processing job
5. Verify thumbnail appears in the notes list

## Deployment

### 1. Deploy Trigger.dev Tasks

```bash
npx trigger.dev@latest deploy
```

### 2. Environment Variables

Make sure all environment variables are set in your production environment:

- `TRIGGER_PROJECT_ID`
- `TRIGGER_SECRET_KEY`

The video processing will use your existing Tigris/S3-compatible storage
configuration.

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: The build extension should handle this, but ensure it's
   properly configured in `trigger.config.ts`

2. **Storage permissions**: Ensure your Tigris/S3-compatible storage has proper
   upload and read permissions

3. **Database connection**: Make sure `setPrismaClient(prisma)` is called before
   triggering jobs

4. **Video processing fails**: Check the Trigger.dev dashboard logs for detailed
   error messages

### Debug Steps

1. Check Trigger.dev dashboard for job logs
2. Verify environment variables are set correctly
3. Test storage connectivity manually
4. Check database for video records and their status

## Next Steps

- Add video duration detection
- Implement video compression
- Add support for multiple thumbnail timestamps
- Add video preview/playback functionality
- Implement video transcoding for different formats

## Support

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
