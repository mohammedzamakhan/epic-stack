# Asana Integration Provider Implementation

## Overview

The Asana integration provider enables users to connect their notes to Asana
projects, automatically creating tasks when notes are shared. This integration
follows the same architectural patterns as other providers in the system.

## Features

### OAuth 2.0 Authentication

- Full OAuth 2.0 flow with Asana
- Automatic token refresh support
- Secure token storage with AES-256-GCM encryption
- Workspace-level permissions (no specific scopes required)

### Project Discovery

- Lists all accessible projects across user's workspaces
- Filters out archived projects automatically
- Groups projects by workspace for better organization
- Supports both public and private projects

### Task Creation

- Creates tasks in selected Asana projects from note content
- Configurable content inclusion (full note content or just title)
- Support for default assignees and project sections
- Automatic source URL attribution
- Rich task descriptions with author information

### Connection Management

- Real-time connection validation
- Project accessibility verification
- Comprehensive error handling and logging
- Automatic retry logic for transient failures

## API Integration

### Base URL

```
https://app.asana.com/api/1.0
```

### Authentication

- Uses Bearer token authentication
- Tokens obtained via OAuth 2.0 flow
- Automatic refresh when tokens expire

### Key Endpoints Used

#### OAuth Endpoints

- `GET https://app.asana.com/-/oauth_authorize` - Authorization URL
- `POST https://app.asana.com/-/oauth_token` - Token exchange and refresh

#### API Endpoints

- `GET /users/me` - Get current user information
- `GET /workspaces` - List accessible workspaces
- `GET /projects` - List projects in workspace
- `POST /tasks` - Create new tasks
- `GET /projects/{project_gid}` - Validate project access

### Rate Limiting

- Asana allows up to 1500 requests per minute per user
- Provider implements proper error handling for rate limit responses
- Automatic retry logic for transient failures

## Configuration

### Environment Variables

```bash
ASANA_CLIENT_ID=your_asana_client_id
ASANA_CLIENT_SECRET=your_asana_client_secret
```

### Provider Configuration (AsanaConfig)

```typescript
interface AsanaConfig {
	user: {
		gid: string
		name: string
		email?: string
		photo?: {
			image_21x21?: string
			image_27x27?: string
			image_36x36?: string
			image_60x60?: string
		}
	}
	workspaces: Array<{
		gid: string
		name: string
		resource_type: string
	}>
}
```

### Connection Configuration (AsanaConnectionConfig)

```typescript
interface AsanaConnectionConfig {
	projectGid: string
	projectName: string
	workspaceName: string
	includeNoteContent: boolean
	defaultAssignee?: string // User GID to assign tasks to by default
	defaultSection?: string // Section GID to add tasks to
}
```

## Usage Flow

### 1. OAuth Authorization

1. User initiates connection from organization settings
2. System redirects to Asana OAuth authorization page
3. User grants permissions to their Asana workspace(s)
4. Asana redirects back with authorization code
5. Provider exchanges code for access and refresh tokens
6. User and workspace information is fetched and stored

### 2. Project Selection

1. Provider fetches all accessible projects across user's workspaces
2. Projects are presented as "channels" in the UI
3. User selects target project for note integration
4. Connection configuration is saved with project details

### 3. Task Creation

1. When a note is shared, provider creates a task in the selected project
2. Task includes note title, content (if enabled), author, and source URL
3. Default assignee and section are applied if configured
4. Task URL is logged for reference

### 4. Connection Validation

1. Periodic validation ensures project is still accessible
2. Token refresh is handled automatically when needed
3. Invalid connections are flagged for user attention

## Error Handling

### OAuth Errors

- Invalid client credentials
- User denies authorization
- Invalid or expired authorization codes
- Token refresh failures

### API Errors

- Rate limiting (429 responses)
- Invalid project access (403/404 responses)
- Malformed requests (400 responses)
- Server errors (5xx responses)

### Connection Errors

- Archived or deleted projects
- Revoked workspace access
- Invalid configuration data

## Security Considerations

### Token Security

- All tokens encrypted at rest using AES-256-GCM
- Tokens decrypted only when needed for API calls
- Refresh tokens used to maintain long-term access
- Automatic token rotation on refresh

### API Security

- All API calls use HTTPS
- Bearer token authentication
- Proper error handling to prevent information leakage
- Rate limiting compliance

### Data Privacy

- Minimal data storage (only necessary for integration)
- User data encrypted in database
- No sensitive note content stored in Asana metadata
- Configurable content inclusion for privacy control

## Limitations

### Asana API Limitations

- Rate limit of 1500 requests per minute per user
- Projects must exist in accessible workspaces
- Tasks can only be created in projects user has write access to
- Some advanced task features not supported (custom fields, dependencies)

### Integration Limitations

- No real-time sync from Asana back to notes
- Task updates in Asana don't reflect in original notes
- Limited to task creation (no task editing/deletion)
- Workspace permissions determine available projects

## Testing

### Development Mode

- Supports demo credentials for development testing
- Mock responses for OAuth flow when credentials unavailable
- Comprehensive error logging for debugging
- Validation of all API responses

### Production Considerations

- Proper error monitoring and alerting
- Token refresh monitoring
- Connection health checks
- User notification for failed integrations

## Future Enhancements

### Potential Features

- Bidirectional sync (Asana updates → note updates)
- Custom field mapping
- Task template support
- Bulk task creation
- Advanced project filtering
- Team-level integrations

### API Improvements

- Webhook support for real-time updates
- Batch API operations for better performance
- Advanced search and filtering
- Custom field support
- Project template integration

## Troubleshooting

### Common Issues

#### OAuth Failures

- Verify client ID and secret are correct
- Check redirect URI matches registered URI
- Ensure user has proper workspace permissions

#### API Errors

- Check token validity and refresh if needed
- Verify project still exists and is accessible
- Confirm user has write permissions to project

#### Connection Issues

- Validate project GID is correct
- Check if project has been archived or deleted
- Verify workspace access hasn't been revoked

### Debug Information

- All API calls logged with request/response details
- OAuth flow steps logged for troubleshooting
- Error messages include context for debugging
- Connection validation results logged

## Architecture Compliance

This provider follows the established patterns of other integrations:

- Extends `BaseIntegrationProvider` class
- Implements all required `IntegrationProvider` interface methods
- Uses consistent OAuth state management
- Follows same encryption/decryption patterns
- Uses identical error handling conventions
- Registered in provider registry for UI availability
- Consistent logging and debugging approach
