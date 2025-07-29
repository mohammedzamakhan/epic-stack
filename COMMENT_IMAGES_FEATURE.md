# Comment Images Feature

This feature adds the ability to upload and display images in comments on organization notes.

## What's Added

### Database Changes
- Added `NoteCommentImage` model to store comment images
- Added relationship between `NoteComment` and `NoteCommentImage`
- Migration: `20250729194509_add_comment_images`

### Frontend Components
- `CommentImageUpload`: Button component for selecting images (drag & drop support)
- `CommentImagePreview`: Component to preview selected images before submission
- Updated `CommentInput` to support image uploads (max 3 images per comment)
- Updated `CommentItem` to display images in comments
- Updated `CommentsSection` to handle image uploads in form submissions

### Backend Changes
- Added `uploadCommentImage` function to handle image storage
- Updated comment creation action to handle multipart form data
- Added image upload processing for comments and replies
- Updated comment queries to include image data

## Usage

1. **Adding Images to Comments**: Click the camera icon in the comment input to select images
2. **Image Limits**: Maximum 3 images per comment
3. **File Size**: Maximum 3MB per image
4. **Supported Formats**: All image formats (jpg, png, gif, etc.)
5. **Display**: Images are shown as 96x96px thumbnails that link to full-size versions

## Technical Details

### Image Storage
- Images are stored in S3-compatible storage under `users/{userId}/comments/{commentId}/images/`
- File naming: `{timestamp}-{fileId}.{extension}`

### Database Schema
```sql
CREATE TABLE "NoteCommentImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "altText" TEXT,
    "objectKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,
    CONSTRAINT "NoteCommentImage_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "NoteComment" ("id") ON DELETE CASCADE
);
```

### API Changes
- Comment creation now accepts multipart form data
- Images are sent as `image-0`, `image-1`, etc. with `imageCount` parameter
- Activity logging includes `hasImages` metadata

## Files Modified

### Database
- `packages/prisma/schema.prisma` - Added NoteCommentImage model
- `packages/prisma/migrations/20250729194509_add_comment_images/migration.sql` - Migration file

### Frontend Components
- `apps/web/app/components/note/comment-input.tsx` - Added image upload support
- `apps/web/app/components/note/comment-item.tsx` - Added image display
- `apps/web/app/components/note/comments-section.tsx` - Updated form handling
- `apps/web/app/components/note/comment-image-upload.tsx` - New component
- `apps/web/app/components/note/comment-image-preview.tsx` - New component

### Backend
- `apps/web/app/routes/app+/$orgSlug_+/notes.$noteId.tsx` - Updated comment actions
- `apps/web/app/utils/storage.server.ts` - Added uploadCommentImage function

## Future Enhancements

1. **Image Compression**: Add client-side image compression before upload
2. **Alt Text Support**: Allow users to add alt text for accessibility
3. **Image Editing**: Basic crop/resize functionality
4. **Bulk Upload**: Support for uploading multiple images at once
5. **Image Gallery**: Better display for multiple images (carousel, grid, etc.)