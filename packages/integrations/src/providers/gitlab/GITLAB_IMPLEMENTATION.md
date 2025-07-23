# GitLab Integration Implementation

This document outlines the implementation details for the GitLab integration provider, which allows users to connect their notes to GitLab projects for issue tracking and project management.

## Overview

The GitLab integration enables users to:
- Connect to GitLab.com or self-hosted GitLab instances
- Browse and select GitLab projects as integration destinations
- Automatically create GitLab issues from note content
- Configure issue creation with labels, milestones, and assignees
- Support for both public and private projects

## Architecture

### Provider Class: `GitLabProvider`

The `GitLabProvider` class extends `BaseIntegrationProvider` and implements the `IntegrationProvider` interface, following the same patterns as other providers in the system.

**Key Properties:**
- `name`: 'gitlab'
- `type`: 'productivity'
- `displayName`: 'GitLab'
- `description`: 'Connect notes to GitLab projects for issue tracking and project management'

### OAuth Configuration

**Required Environment Variables:**
- `GITLAB_CLIENT_ID` - GitLab OAuth application client ID
- `GITLAB_CLIENT_SECRET` - GitLab OAuth application client secret

**OAuth Scopes:**
- `api` - Full API access
- `read_user` - Read user profile information
- `read_repository` - Read repository information
- `write_repository` - Write access for issue creation

**OAuth Flow:**
1. User initiates connection from organization settings
2. System generates secure state parameter with organization context
3. User is redirected to GitLab OAuth authorization page
4. After approval, GitLab redirects back with authorization code
5. System exchanges code for access and refresh tokens
6. User profile and instance information is stored in integration config

### Self-Hosted GitLab Support

The provider supports both GitLab.com and self-hosted GitLab instances:
- Default: Uses `https://gitlab.com` for OAuth and API calls
- Custom instances: Accepts `instanceUrl` parameter during OAuth flow
- API base URL is automatically constructed from instance URL
- All API endpoints respect the configured instance URL

## API Integration

### Core Endpoints Used

**Authentication:**
- `POST /oauth/token` - Token exchange and refresh
- `GET /api/v4/user` - Get current user information

**Projects:**
- `GET /api/v4/projects?membership=true` - List user's projects
- `GET /api/v4/projects/{id}` - Get specific project details

**Issues:**
- `POST /api/v4/projects/{id}/issues` - Create new issue
- `GET /api/v4/projects/{id}/labels` - Get project labels
- `GET /api/v4/projects/{id}/milestones` - Get project milestones
- `GET /api/v4/projects/{id}/users` - Search project users

### Data Models

**GitLabProject:**
```typescript
interface GitLabProject {
  id: number
  name: string
  name_with_namespace: string
  path: string
  path_with_namespace: string
  description?: string
  default_branch: string
  visibility: 'private' | 'internal' | 'public'
  web_url: string
  avatar_url?: string
  namespace: {
    id: number
    name: string
    path: string
    kind: 'user' | 'group'
  }
}
```

**GitLabUser:**
```typescript
interface GitLabUser {
  id: number
  username: string
  name: string
  email?: string
  avatar_url?: string
  web_url: string
  state: 'active' | 'blocked'
}
```

**GitLabIssue:**
```typescript
interface GitLabIssue {
  id: number
  iid: number
  title: string
  description?: string
  state: 'opened' | 'closed'
  web_url: string
  author: GitLabUser
  assignees: GitLabUser[]
  labels: string[]
  milestone?: {
    id: number
    title: string
  }
  project_id: number
}
```

## Integration Configuration

### Provider Config Schema

```typescript
{
  type: 'object',
  properties: {
    instanceUrl: {
      type: 'string',
      title: 'GitLab Instance URL',
      description: 'Custom GitLab instance URL (leave empty for gitlab.com)',
      format: 'uri'
    },
    user: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        username: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        avatarUrl: { type: 'string' }
      },
      required: ['id', 'username', 'name']
    }
  }
}
```

### Connection Config Options

Each note-to-project connection can be configured with:
- `projectId` - Target GitLab project ID
- `includeNoteContent` - Whether to include full note content in issues (default: true)
- `defaultLabels` - Array of label names to apply to created issues
- `milestoneId` - Default milestone ID for created issues
- `assigneeId` - Default assignee user ID for created issues

## Issue Creation Workflow

When a note is created or updated with a GitLab connection:

1. **Format Issue Data:**
   - Title: Truncated note title (max 255 characters)
   - Description: Formatted with author info, note content, and link back to note
   - Labels: Applied from connection configuration
   - Milestone: Set from connection configuration
   - Assignee: Set from connection configuration

2. **Create Issue:**
   - POST request to `/api/v4/projects/{projectId}/issues`
   - Includes all formatted issue data
   - Returns created issue with ID and web URL

3. **Error Handling:**
   - Token refresh on 401 errors
   - Detailed error messages for debugging
   - Graceful fallback if issue creation fails

## Token Management

**Access Tokens:**
- Standard OAuth 2.0 bearer tokens
- Typically expire after 2 hours
- Automatically refreshed using refresh tokens

**Refresh Tokens:**
- Long-lived tokens for automatic access token renewal
- Stored securely in integration record
- Used automatically when access token expires

**Token Refresh Flow:**
1. API call returns 401 Unauthorized
2. System attempts token refresh using stored refresh token
3. If successful, retry original API call with new access token
4. If refresh fails, integration is marked as requiring re-authorization

## Security Considerations

**OAuth State Management:**
- Cryptographically secure state parameters
- Timestamp validation to prevent replay attacks
- Organization context validation
- Nonce support for additional security

**API Security:**
- All API calls use HTTPS
- Bearer token authentication
- Proper error handling to avoid token leakage
- Rate limiting respect through proper error handling

**Data Privacy:**
- Only necessary scopes requested
- User data stored minimally in integration config
- Tokens encrypted at rest in database
- No sensitive data logged in error messages

## Error Handling

**Common Error Scenarios:**
- Invalid or expired tokens → Automatic refresh attempt
- Project access denied → Clear error message to user
- Network connectivity issues → Retry with exponential backoff
- GitLab API rate limiting → Respect rate limit headers
- Invalid project configuration → Validation error messages

**Error Response Format:**
All errors are wrapped in descriptive messages that help users understand:
- What went wrong
- Whether it's a temporary or permanent issue
- What actions they can take to resolve it

## Testing Considerations

**Unit Tests Should Cover:**
- OAuth flow with valid and invalid responses
- Token refresh scenarios
- API call error handling
- Issue creation with various configurations
- Self-hosted GitLab instance support

**Integration Tests Should Cover:**
- End-to-end OAuth flow
- Project listing and selection
- Issue creation from actual notes
- Connection validation
- Token refresh in real scenarios

## Future Enhancements

**Potential Features:**
- Merge request creation from notes
- Bi-directional sync (GitLab issues → notes)
- Webhook support for real-time updates
- Advanced issue templates
- Custom field mapping
- Bulk operations support
- GitLab CI/CD integration for deployment notes

**Performance Optimizations:**
- Project list caching
- Batch API operations
- Background job processing for large operations
- Rate limit optimization
