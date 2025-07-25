# ClickUp Integration Implementation

This document outlines the implementation details for the ClickUp integration
provider, which allows users to connect their notes to ClickUp spaces and lists
for task management and project tracking.

## Overview

The ClickUp integration enables users to:

- Connect to ClickUp workspaces and teams
- Browse and select ClickUp spaces and lists as integration destinations
- Automatically create ClickUp tasks from note content
- Configure task creation with priorities, assignees, tags, and status
- Support for both public and private spaces

## Architecture

### Provider Class: `ClickUpProvider`

Extends `BaseIntegrationProvider` and implements all required interface methods.

**Key Properties:**

- `name`: 'clickup'
- `type`: 'productivity'
- `displayName`: 'ClickUp'
- `description`: 'Connect notes to ClickUp spaces and lists for task management
  and project tracking'

### OAuth Configuration

**Required Environment Variables:**

- `CLICKUP_CLIENT_ID` - ClickUp OAuth application client ID
- `CLICKUP_CLIENT_SECRET` - ClickUp OAuth application client secret

**OAuth Flow:**

1. User clicks connect button
2. Redirected to ClickUp OAuth authorization URL
3. User authorizes application access
4. ClickUp redirects back with authorization code
5. Provider exchanges code for access token
6. User information is fetched and stored in integration config

**Important Note:** ClickUp does not currently support refresh tokens. When
access tokens expire, users must re-authenticate.

### API Integration

**Base URL:** `https://api.clickup.com/api/v2` **Auth URL:**
`https://app.clickup.com/api`

**Authentication:** Bearer token in Authorization header

### Core Methods

#### `getAuthUrl(organizationId, redirectUri, additionalParams?)`

- Generates ClickUp OAuth authorization URL
- Includes secure state parameter for CSRF protection
- Returns authorization URL for user redirection

#### `handleCallback(params)`

- Validates OAuth state parameter
- Exchanges authorization code for access token
- Fetches user information for configuration
- Returns TokenData with access token and user metadata

#### `refreshToken(refreshToken)`

- **Note:** ClickUp doesn't support refresh tokens
- Throws error instructing user to re-authenticate

#### `getAvailableChannels(integration)`

- Fetches user's teams, spaces, and lists
- Maps spaces and lists as channels for consistency
- Returns hierarchical structure: Team > Space > Lists
- Spaces are marked as channels for organization
- Lists are the actual destinations for task creation

#### `postMessage(connection, message)`

- Creates ClickUp task from note message
- Supports list-level task creation only
- Formats task title with emoji and change type
- Includes note content and metadata in description
- Supports configurable task properties (priority, assignees, tags, status)

#### `validateConnection(connection)`

- Validates access token by fetching user information
- Checks if selected list still exists and is accessible
- Returns boolean indicating connection health

## Configuration Schema

The provider supports the following configuration options:

```json
{
	"user": {
		"type": "object",
		"title": "User Information",
		"description": "Connected ClickUp user details",
		"properties": {
			"id": { "type": "number", "title": "User ID" },
			"username": { "type": "string", "title": "Username" },
			"email": { "type": "string", "title": "Email" },
			"profilePicture": { "type": "string", "title": "Profile Picture URL" },
			"initials": { "type": "string", "title": "Initials" },
			"timezone": { "type": "string", "title": "Timezone" }
		}
	}
}
```

## Connection Configuration

Per-connection settings that can be configured:

- `includeNoteContent` (boolean) - Whether to include full note content in task
  description (default: true)
- `defaultPriority` (number) - Default priority level for created tasks
  (1=Urgent, 2=High, 3=Normal, 4=Low)
- `defaultAssignees` (array) - Array of user IDs to assign tasks to by default
- `defaultTags` (array) - Array of tag names to apply to created tasks
- `defaultStatus` (string) - Default status for created tasks

## API Endpoints Used

### OAuth Endpoints

- `https://app.clickup.com/api/oauth/authorize` - OAuth authorization
- `https://app.clickup.com/api/oauth/token` - Token exchange

### ClickUp API v2

- `https://api.clickup.com/api/v2/user` - Get current user information
- `https://api.clickup.com/api/v2/team` - Get user's teams
- `https://api.clickup.com/api/v2/team/{team_id}/space` - Get team spaces
- `https://api.clickup.com/api/v2/space/{space_id}/list` - Get space lists
- `https://api.clickup.com/api/v2/list/{list_id}` - Get specific list details
- `https://api.clickup.com/api/v2/list/{list_id}/task` - Create task in list

## Environment Variables Required

```bash
# ClickUp OAuth Configuration
CLICKUP_CLIENT_ID=your_clickup_client_id
CLICKUP_CLIENT_SECRET=your_clickup_client_secret

# Integration encryption (shared with other providers)
INTEGRATION_ENCRYPTION_KEY=64_character_hex_string
```

## OAuth Application Setup

1. Go to ClickUp App Directory: https://app.clickup.com/apps
2. Click "Build an App" or manage existing apps
3. Create a new OAuth app with the following settings:
   - **App Name**: Your application name
   - **Description**: Brief description of your integration
   - **Redirect URL**: Your OAuth callback endpoint (e.g.,
     `https://yourdomain.com/api/integrations/clickup/callback`)
   - **Scopes**: No specific scopes required (ClickUp uses team-based
     permissions)

## Security Features

- **OAuth State Validation**: Prevents CSRF attacks using secure state
  parameters
- **Token Encryption**: Access tokens are encrypted before database storage
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Input Validation**: Validates all API responses and user inputs
- **Permission Checking**: Respects ClickUp's team and space permission model

## Task Creation Workflow

1. User creates or updates a note with ClickUp integration enabled
2. System triggers `postMessage` with note data
3. Provider validates connection and list access
4. Task data is formatted with:
   - Title: Emoji + truncated note title
   - Description: Change type, author, note URL, and optional content
   - Configurable properties: priority, assignees, tags, status
5. Task is created in specified ClickUp list
6. Success/error is logged and reported

## Error Handling

The provider includes comprehensive error handling for:

- OAuth authentication failures
- Invalid or expired tokens (with re-auth instructions)
- Network connectivity issues
- ClickUp API errors and rate limiting
- Missing or invalid configuration
- Permission denied errors

## Limitations

1. **No Refresh Tokens**: ClickUp doesn't support refresh tokens, requiring
   periodic re-authentication
2. **List-Level Creation**: Tasks can only be created in lists, not directly in
   spaces
3. **Team Permissions**: Integration respects ClickUp's permission model - users
   can only access teams/spaces they have permission for
4. **Rate Limiting**: ClickUp API has rate limits that may affect high-volume
   integrations

## Integration Workflow

1. **Setup**: User configures ClickUp OAuth application and environment
   variables
2. **Authentication**: User authorizes access through ClickUp OAuth flow
3. **Channel Selection**: User selects target ClickUp list for integration
4. **Task Creation**: Notes automatically create tasks in the selected list with
   configurable properties
5. **Maintenance**: Users may need to re-authenticate when tokens expire

## Testing Considerations

- OAuth flow testing with valid/invalid credentials
- Team, space, and list operations testing
- Task creation testing with various configurations
- Error handling testing (expired tokens, permission errors, API failures)
- Connection validation testing
- Configuration schema validation testing

## Next Steps

The ClickUp provider is now ready for integration with:

- Integration management service
- Note update notification system
- Integration settings UI
- API endpoints

All requirements from the design document have been satisfied, and the
implementation follows the established patterns and interfaces used by other
providers (Slack, Jira, Linear, GitLab).
