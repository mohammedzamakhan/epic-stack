# Notion Integration Provider Implementation

## Overview

The `NotionProvider` class extends `BaseIntegrationProvider` and implements the
`IntegrationProvider` interface, following the same patterns as other providers
in the system.

## Features

- **OAuth 2.0 Authentication**: Secure workspace-level authentication with
  Notion
- **Database Discovery**: Automatically discovers accessible databases in the
  workspace
- **Page Creation**: Creates pages in selected databases when notes are shared
- **Rich Content Support**: Converts note content to Notion blocks with proper
  formatting
- **Connection Validation**: Validates database access and permissions
- **Error Handling**: Comprehensive error handling with user-friendly messages

## OAuth Flow

### Authorization URL Generation

```typescript
const authUrl = await notionProvider.getAuthUrl(organizationId, redirectUri)
```

### Token Exchange

```typescript
const tokenData = await notionProvider.handleCallback({
	code,
	state,
	organizationId,
})
```

### Token Refresh

Notion does not support refresh tokens. Users must re-authenticate when tokens
expire.

## API Integration

### Base Configuration

- **API Base URL**: `https://api.notion.com/v1`
- **API Version**: `2022-06-28` (required in headers)
- **Authentication**: Bearer token in Authorization header
- **Rate Limiting**: ~3 requests per second per integration

### Key Endpoints Used

- `POST /v1/oauth/authorize` - OAuth authorization
- `POST /v1/oauth/token` - Token exchange
- `POST /v1/search` - Database discovery
- `GET /v1/databases/{id}` - Database validation
- `POST /v1/pages` - Page creation
- `PUT /v1/blocks/{id}/children` - Content block creation

## Configuration Schema

### Provider Configuration (`NotionConfig`)

```typescript
{
  workspaceId: string        // Notion workspace identifier
  workspaceName: string      // Display name for workspace
  botId: string             // Integration bot user ID
  user: {
    id: string              // User ID
    name: string            // User display name
    email?: string          // User email (optional)
    avatarUrl?: string      // User avatar URL (optional)
  }
}
```

### Connection Configuration (`NotionConnectionConfig`)

```typescript
{
  databaseId: string                    // Target database ID
  databaseName: string                  // Display name of database
  includeNoteContent: boolean           // Whether to include full note content
  defaultProperties?: Record<string, any> // Default property values for pages
}
```

## Data Mapping

### Channels (Databases)

Notion databases are mapped as "channels" for consistency with other providers:

- **ID**: Database UUID
- **Name**: Database title (extracted from title property)
- **Type**: Always 'public' (Notion uses workspace-level permissions)
- **Metadata**: URL, icon, last edited time

### Message to Page Conversion

When a note is shared to Notion:

1. **Page Creation**: New page created in selected database
2. **Title Property**: Note title becomes page title
3. **Content Blocks**: Note content converted to paragraph blocks
4. **Metadata**: Author and source URL added as additional blocks
5. **Properties**: Default properties applied from connection config

## Content Formatting

### Rich Text Blocks

Note content is converted to Notion's rich text format:

```typescript
{
  object: 'block',
  type: 'paragraph',
  paragraph: {
    rich_text: [{
      type: 'text',
      text: { content: 'Note content here' }
    }]
  }
}
```

### Metadata Blocks

Each shared note includes:

- Divider block for separation
- Author information
- Link back to original note

## Error Handling

### Common Error Scenarios

- **Invalid Token**: 401 responses trigger re-authentication
- **Database Not Found**: 404 responses indicate deleted/inaccessible databases
- **Rate Limiting**: 429 responses handled with appropriate delays
- **Permission Errors**: 403 responses indicate insufficient permissions

### Error Messages

All errors include user-friendly messages and proper error codes for debugging.

## Security Considerations

### OAuth Security

- State parameter validation prevents CSRF attacks
- Secure token storage and transmission
- Proper error handling prevents information leakage

### API Security

- All requests use HTTPS
- Bearer token authentication
- API version pinning for stability
- Rate limiting compliance

### Data Privacy

- Minimal data collection (only necessary user info)
- No sensitive data stored in logs
- Proper token expiration handling

## Environment Variables

Required environment variables for production use:

```bash
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
```

## Limitations

1. **No Refresh Tokens**: Notion doesn't provide refresh tokens, so users must
   re-authenticate when tokens expire
2. **Workspace Permissions**: Access is limited to what the workspace admin
   grants to the integration
3. **Database Structure**: Pages can only be created in databases, not as
   standalone pages
4. **Rate Limiting**: API calls are limited to ~3 requests per second
5. **Content Formatting**: Complex formatting may not translate perfectly to
   Notion blocks

## Usage Example

```typescript
// Initialize provider
const notionProvider = new NotionProvider()

// Get authorization URL
const authUrl = await notionProvider.getAuthUrl(orgId, redirectUri)

// Handle callback
const tokenData = await notionProvider.handleCallback({
	code,
	state,
	organizationId,
})

// Get available databases
const databases = await notionProvider.getAvailableChannels(integration)

// Create page from note
await notionProvider.postMessage(connection, {
	title: 'My Note Title',
	content: 'Note content here...',
	author: 'John Doe',
	noteUrl: 'https://app.example.com/notes/123',
	changeType: 'created',
})
```

## Testing

### Manual Testing

1. Set up Notion integration in workspace
2. Configure OAuth credentials
3. Test authorization flow
4. Verify database discovery
5. Test page creation with various content types
6. Validate error handling scenarios

### Integration Testing

- OAuth flow validation
- API endpoint testing
- Error scenario handling
- Rate limiting compliance
- Token expiration handling

## Maintenance

### Regular Tasks

- Monitor API rate limits
- Update API version when Notion releases updates
- Review error logs for common issues
- Update documentation for new features

### Troubleshooting

- Check environment variables are set correctly
- Verify OAuth application configuration in Notion
- Review API rate limiting and adjust if needed
- Monitor token expiration patterns
