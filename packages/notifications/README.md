# Notifications Package

This package contains Novu workflow definitions and utilities for handling notifications in the application.

## Workflows

### Comment Mention Workflow (`comment-mention-workflow`)
Triggered when a user is mentioned in a comment using `@username` or `@[User Name]` syntax.

**Payload:**
- `noteId`: ID of the note
- `commentId`: ID of the comment
- `noteTitle`: Title of the note
- `commenterName`: Name of the user who made the comment
- `commentContent`: Content of the comment
- `organizationSlug`: Organization slug for URL generation
- `noteUrl`: Direct URL to the note

### Note Comment Workflow (`note-comment-workflow`)
Triggered when someone comments on a note (sent to the note owner).

**Payload:**
- `noteId`: ID of the note
- `commentId`: ID of the comment
- `noteTitle`: Title of the note
- `commenterName`: Name of the user who made the comment
- `commentContent`: Content of the comment
- `organizationSlug`: Organization slug for URL generation
- `noteUrl`: Direct URL to the note

## Utilities

### Mention Parser
- `extractMentions(content: string)`: Extracts mentions from comment content
- `resolveMentionsToUserIds(mentions, organizationMembers)`: Resolves mention strings to user IDs

## Usage

The notification system is automatically triggered when comments are added to notes. The system:

1. Extracts mentions from comment content
2. Resolves mentions to actual user IDs
3. Sends notifications to mentioned users (excluding the commenter)
4. Sends notification to note owner if someone else commented

## Environment Variables

Make sure these are set in your `.env` file:

```
NOVU_SECRET_KEY="your-novu-secret-key"
BASE_URL="http://localhost:3000"  # or your production URL
```

## Mention Formats Supported

- `@username` - Mentions by username
- `@[User Name]` - Mentions by display name
- `@userId` - Direct user ID mentions (for programmatic use)