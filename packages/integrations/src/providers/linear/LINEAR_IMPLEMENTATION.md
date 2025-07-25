# Linear Integration Implementation

This document describes the implementation of the Linear integration provider
for the Epic Stack integrations system.

## Overview

The Linear integration allows users to connect their notes to Linear teams and
projects, automatically creating issues when notes are created, updated, or
deleted. Linear is a modern project management and issue tracking tool that uses
GraphQL for its API.

## Features

### Core Functionality

- **OAuth 2.0 Authentication**: Secure authentication using Linear's OAuth 2.0
  flow
- **Team Integration**: Connect notes to Linear teams for issue creation
- **Project Integration**: Connect notes to Linear projects for organized issue
  tracking
- **Issue Creation**: Automatically create Linear issues from note changes
- **Connection Validation**: Verify that connections are still active and
  accessible

### Supported Operations

- List available teams and projects
- Create issues in teams or projects
- Format issue titles and descriptions with note content
- Validate connection status

## Authentication

### OAuth 2.0 Flow

Linear uses OAuth 2.0 for authentication with the following configuration:

- **Authorization URL**: `https://linear.app/oauth/authorize`
- **Token URL**: `https://linear.app/oauth/token`
- **Scopes**: `read,write` (read access to Linear data, write access to create
  issues)

### Required Environment Variables

```bash
LINEAR_CLIENT_ID=your_linear_client_id
LINEAR_CLIENT_SECRET=your_linear_client_secret
```

### OAuth Configuration

1. Create a Linear OAuth application at https://linear.app/settings/api
2. Set the redirect URI to your application's OAuth callback endpoint
3. Configure the required scopes: `read,write`

## API Integration

### GraphQL API

Linear uses a GraphQL API at `https://api.linear.app/graphql`. All requests
require:

- **Authorization**: `Bearer {access_token}`
- **Content-Type**: `application/json`

### Key GraphQL Queries

#### Get Current User

```graphql
query {
	viewer {
		id
		name
		displayName
		email
		avatarUrl
	}
}
```

#### Get Teams

```graphql
query {
	teams {
		nodes {
			id
			name
			key
			description
			color
			icon
		}
	}
}
```

#### Get Projects

```graphql
query {
	projects {
		nodes {
			id
			name
			description
			color
			state
			teams {
				nodes {
					id
					name
					key
				}
			}
		}
	}
}
```

#### Create Issue

```graphql
mutation ($input: IssueCreateInput!) {
	issueCreate(input: $input) {
		success
		issue {
			id
			identifier
			title
			description
			url
			state {
				name
				color
			}
			team {
				id
				name
				key
			}
			project {
				id
				name
			}
		}
	}
}
```

## Configuration

### Provider Configuration (LinearConfig)

```typescript
interface LinearConfig {
	userId: string // Linear user ID
	userName: string // Linear user display name
	userEmail: string // Linear user email
	scope: string // OAuth scope granted
}
```

### Connection Configuration (LinearConnectionConfig)

```typescript
interface LinearConnectionConfig {
	channelId: string // Team or project ID (prefixed with 'team:' or 'project:')
	channelName: string // Display name of the team or project
	channelType: 'team' | 'project' // Type of Linear entity
	includeNoteContent: boolean // Whether to include full note content in issues
	defaultIssueState?: string // Default state for created issues
	issuePriority?: string // Priority level for created issues
}
```

## Data Models

### Channel Representation

Teams and projects are represented as channels for consistency with other
providers:

- **Team Channels**: `team:{teamId}` - Direct team integration
- **Project Channels**: `project:{projectId}` - Project-specific integration

### Issue Creation

When a note is connected to Linear, issues are created with:

- **Title**: Formatted with emoji prefix based on change type (📝 created, ✏️
  updated, 🗑️ deleted)
- **Description**: Includes note URL, author, action type, and optionally the
  full note content
- **Team Assignment**: Issues are assigned to the connected team
- **Project Assignment**: For project connections, issues are assigned to both
  the project and its primary team

## Error Handling

### Common Error Scenarios

1. **Invalid OAuth Token**: Token expired or revoked
2. **Insufficient Permissions**: User lacks access to team/project
3. **GraphQL Errors**: API-level errors from Linear
4. **Network Issues**: Connection problems with Linear API

### Error Recovery

- Token validation before API calls
- Graceful degradation when connections are invalid
- Detailed error messages for debugging
- Connection status validation

## Security Considerations

### Token Management

- Access tokens are stored encrypted in the database
- Tokens are validated before use
- No refresh token support (Linear tokens are long-lived, typically 1 year)

### Data Privacy

- Only necessary user information is stored
- Issue content respects user privacy settings
- Connection configurations are stored securely

## Usage Examples

### Creating a Team Connection

```typescript
// User selects a team during connection setup
const teamChannel = {
	id: 'team:abc123',
	name: 'Engineering Team',
	type: 'public',
	metadata: {
		type: 'team',
		teamId: 'abc123',
		teamKey: 'ENG',
		color: '#3b82f6',
	},
}
```

### Creating a Project Connection

```typescript
// User selects a project during connection setup
const projectChannel = {
	id: 'project:def456',
	name: 'Mobile App Project - Engineering',
	type: 'public',
	metadata: {
		type: 'project',
		projectId: 'def456',
		state: 'active',
		teams: [{ id: 'abc123', name: 'Engineering', key: 'ENG' }],
	},
}
```

### Issue Creation from Note

When a note titled "Fix login bug" is created by "John Doe":

```markdown
📝 Fix login bug

**Note:** [Fix login bug](https://app.example.com/notes/123) **Author:** John
Doe **Action:** Created

**Content:** The login form is not validating email addresses correctly. Users
can submit invalid emails and the system accepts them.
```

## Implementation Notes

### GraphQL Integration

- All API calls use GraphQL for consistency with Linear's API design
- Proper error handling for GraphQL-specific error formats
- Efficient queries to minimize API calls

### Channel Mapping

- Teams and projects are both represented as "channels" for UI consistency
- Channel IDs are prefixed to distinguish between teams and projects
- Metadata includes type-specific information for proper handling

### Token Limitations

- Linear doesn't support refresh tokens
- Access tokens are long-lived (typically 1 year)
- Re-authentication required when tokens expire

## Testing

### Unit Tests

- OAuth flow validation
- GraphQL query construction
- Error handling scenarios
- Channel mapping logic

### Integration Tests

- End-to-end OAuth flow
- Issue creation in teams and projects
- Connection validation
- Error recovery scenarios

## Future Enhancements

### Potential Features

- **Bi-directional Sync**: Update notes when Linear issues change
- **Custom Issue Types**: Support for different Linear issue types
- **Label Management**: Automatic labeling of created issues
- **Assignee Selection**: Allow specifying issue assignees
- **Priority Mapping**: Map note urgency to Linear priority levels
- **Webhook Support**: Real-time updates from Linear to notes

### API Improvements

- **Batch Operations**: Create multiple issues efficiently
- **Rich Text Support**: Better formatting for issue descriptions
- **File Attachments**: Support for note attachments in issues
- **Comment Sync**: Sync note comments to Linear issue comments
