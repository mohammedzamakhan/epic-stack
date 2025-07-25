# Note Update Notification System

This document describes the note update notification system that automatically
posts messages to connected third-party integrations when notes are created,
updated, or deleted.

## Overview

The note notification system consists of three main components:

1. **Note Event Handler** - Processes note change events and triggers
   integrations
2. **Note Hooks** - Middleware that automatically detects note changes
3. **Integration Manager** - Handles the actual message posting to external
   services

## Architecture

```
Note Route Handler
       ↓
   Note Hooks (Middleware)
       ↓
Note Event Handler
       ↓
Integration Manager
       ↓
External Services (Slack, Teams, etc.)
```

## Components

### 1. Note Event Handler (`note-event-handler.ts`)

The core component that processes note change events and coordinates with the
integration system.

**Key Features:**

- Handles three types of note changes: created, updated, deleted
- Detects what changed in note updates (title, content)
- Manages event queuing and processing
- Provides statistics and monitoring
- Supports batch event processing

**Main Methods:**

- `handleNoteCreated(noteId, userId)` - Process note creation
- `handleNoteUpdated(noteId, userId, previousData?)` - Process note updates
- `handleNoteDeleted(noteId, userId, noteData)` - Process note deletion
- `getEventStats(organizationId, timeRange?)` - Get processing statistics

### 2. Note Hooks (`note-hooks.ts`)

Middleware system that automatically triggers notifications when notes change.

**Key Features:**

- Automatic change detection
- Asynchronous processing (doesn't block main request)
- Error handling and logging
- Snapshot capture for change detection
- Batch processing support

**Main Methods:**

- `afterNoteCreated(noteId, userId)` - Hook for after note creation
- `afterNoteUpdated(noteId, userId, previousData?)` - Hook for after note update
- `beforeNoteDeleted(noteId, userId)` - Hook for before note deletion
- `captureNoteSnapshot(noteId)` - Capture note state for change detection

**Convenience Functions:**

- `triggerNoteCreated(noteId, userId)` - Simple creation trigger
- `triggerNoteUpdated(noteId, userId, previousData?)` - Simple update trigger
- `triggerNoteDeleted(noteId, userId)` - Simple deletion trigger

### 3. Note Operation Wrapper

Utility class that wraps note operations with automatic hook triggering.

**Usage:**

```typescript
// Wrap note creation
const result = await NoteOperationWrapper.create(
  () => prisma.organizationNote.create({...}),
  noteId,
  userId
)

// Wrap note update with change detection
const result = await NoteOperationWrapper.update(
  () => prisma.organizationNote.update({...}),
  noteId,
  userId,
  true // capture snapshot
)

// Wrap note deletion
const result = await NoteOperationWrapper.delete(
  () => prisma.organizationNote.delete({...}),
  noteId,
  userId
)
```

## Integration with Route Handlers

The system is integrated into the existing note route handlers:

### Note Creation/Update (`__org-note-editor.server.tsx`)

```typescript
// Check if this is a new note or an update
const existingNote = await prisma.organizationNote.findUnique({
	where: { id: noteId },
	select: { id: true, title: true, content: true },
})

const isNewNote = !existingNote
let beforeSnapshot: { title: string; content: string } | undefined

if (!isNewNote && existingNote) {
	beforeSnapshot = {
		title: existingNote.title,
		content: existingNote.content,
	}
}

const updatedNote = await prisma.organizationNote.upsert({
	// ... upsert logic
})

// Trigger integration hooks
if (isNewNote) {
	await noteHooks.afterNoteCreated(updatedNote.id, userId)
} else {
	await noteHooks.afterNoteUpdated(updatedNote.id, userId, beforeSnapshot)
}
```

### Note Deletion (`notes.$noteId.tsx`)

```typescript
// Trigger deletion hook before deleting the note
await noteHooks.beforeNoteDeleted(note.id, userId)

// Delete the note
await prisma.organizationNote.delete({ where: { id: note.id } })
```

## Message Format

When a note change is detected, the system formats messages based on the change
type:

### Note Created

```
📝 New note created: "Note Title"
Content preview...
👤 Created by: User Name
🔗 View note: [link]
```

### Note Updated

```
✏️ Note updated: "Note Title"
Content preview...
👤 Updated by: User Name
🔗 View note: [link]
```

### Note Deleted

```
🗑️ Note deleted: "Note Title"
👤 Deleted by: User Name
```

## Configuration

The notification system respects the existing integration configuration:

1. **Organization Integrations** - Only organizations with active integrations
   receive notifications
2. **Note Connections** - Only notes connected to specific channels receive
   notifications
3. **Provider Settings** - Each provider can customize message formatting
4. **Rate Limiting** - Built-in rate limiting prevents spam

## Error Handling

The system includes comprehensive error handling:

1. **Graceful Degradation** - Notification failures don't break note operations
2. **Retry Logic** - Failed notifications are logged for potential retry
3. **Error Logging** - All errors are logged with context for debugging
4. **Monitoring** - Event statistics help monitor system health

## Monitoring and Statistics

The system provides detailed statistics:

```typescript
const stats = await noteEventHandler.getEventStats('org-id', 24) // last 24 hours
// Returns:
// {
//   totalEvents: 15,
//   successfulEvents: 14,
//   failedEvents: 1,
//   connectionsNotified: 8
// }
```

## Performance Considerations

1. **Asynchronous Processing** - All notifications are processed asynchronously
2. **Batch Processing** - Multiple events can be processed together
3. **Connection Pooling** - Reuses existing integration connections
4. **Caching** - Caches organization and connection data
5. **Rate Limiting** - Prevents overwhelming external services

## Testing

The system includes comprehensive tests:

- **Unit Tests** - Test individual components in isolation
- **Integration Tests** - Test the full notification flow
- **Demo Scripts** - Manual testing utilities

Run tests:

```bash
npm run test -- note-event-handler.test.ts
npm run test -- note-hooks.test.ts
```

Run demo:

```typescript
import { runAllDemos } from './note-notification-demo'
await runAllDemos()
```

## Troubleshooting

### Common Issues

1. **No Notifications Sent**

   - Check if organization has active integrations
   - Verify note has connections to channels
   - Check integration logs for errors

2. **Partial Notifications**

   - Some integrations may fail while others succeed
   - Check individual integration status
   - Review error logs for specific failures

3. **Performance Issues**
   - Monitor event processing statistics
   - Check for rate limiting
   - Review database query performance

### Debug Information

Enable debug logging:

```typescript
// Set environment variable
DEBUG=integrations:notifications

// Or check logs programmatically
const stats = await noteEventHandler.getEventStats('org-id')
console.log('Event stats:', stats)
```

## Future Enhancements

Potential improvements to consider:

1. **Event Queuing** - Use a proper queue system for high-volume scenarios
2. **Webhook Support** - Allow external systems to subscribe to note events
3. **Custom Templates** - Let users customize notification message templates
4. **Filtering Rules** - Allow filtering which notes trigger notifications
5. **Digest Mode** - Batch multiple changes into digest notifications
6. **Real-time Updates** - WebSocket support for real-time notifications

## Security Considerations

1. **Access Control** - Only users with note access can trigger notifications
2. **Data Sanitization** - Note content is truncated and sanitized
3. **Token Security** - Integration tokens are encrypted at rest
4. **Rate Limiting** - Prevents abuse and spam
5. **Audit Logging** - All notification events are logged for audit purposes
