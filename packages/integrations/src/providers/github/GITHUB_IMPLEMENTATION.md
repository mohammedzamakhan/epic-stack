# GitHub Integration Provider Implementation

## Overview

The GitHub integration provider enables users to connect their notes to GitHub repositories for issue tracking and project management. This provider follows the established patterns used by other integration providers in the system.

## Features

- **OAuth 2.0 Authentication**: Secure authentication with GitHub using OAuth 2.0 flow
- **Repository Discovery**: List all accessible repositories where the user has push permissions
- **Issue Creation**: Create GitHub issues from note messages with rich content and metadata
- **Connection Validation**: Real-time validation of repository access and permissions
- **Configurable Options**: Support for default labels, assignees, and milestones

## OAuth Configuration

### Environment Variables

```bash
# GitHub Integration OAuth Configuration
# Get these from https://github.com/settings/applications/new (create a new OAuth app)
# Note: These are separate from the existing GITHUB_CLIENT_ID/SECRET used for authentication
GITHUB_INTEGRATION_CLIENT_ID="your-github-integration-client-id"
GITHUB_INTEGRATION_CLIENT_SECRET="your-github-integration-client-secret"
```

### OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create a new OAuth App with the following settings:
   - **Application name**: Your app name (e.g., "Epic Stack Integration")
   - **Homepage URL**: Your application URL
   - **Authorization callback URL**: `https://your-domain.com/api/integrations/oauth/callback`
3. Copy the Client ID and Client Secret to your environment variables

### OAuth Scopes

The GitHub provider requests the following scopes:

- `repo` - Full access to repositories (required for creating issues)
- `read:user` - Read user profile information
- `user:email` - Access to user email addresses

## API Integration

### Base Configuration

- **API Base URL**: `https://api.github.com`
- **OAuth Base URL**: `https://github.com/login/oauth`
- **API Version**: GitHub REST API v3
- **Authentication**: Bearer token in Authorization header
- **Rate Limiting**: 5,000 requests per hour for authenticated requests

### Key Endpoints

- `/user` - Get current user information
- `/user/repos` - List user repositories
- `/repos/{owner}/{repo}` - Get specific repository
- `/repos/{owner}/{repo}/issues` - Create and manage issues
- `/repos/{owner}/{repo}/labels` - Get repository labels
- `/repos/{owner}/{repo}/milestones` - Get repository milestones
- `/repos/{owner}/{repo}/collaborators` - Get repository collaborators

## Data Models

### Repository Structure

Repositories are mapped as "channels" for consistency with other providers:

```typescript
interface Channel {
  id: string // Repository ID
  name: string // "owner/repo" format
  type: 'public' | 'private'
  metadata: {
    repositoryId: string
    repositoryName: string
    repositoryFullName: string
    ownerName: string
    description?: string
    htmlUrl: string
    defaultBranch: string
    isPrivate: boolean
    isFork: boolean
  }
}
```

### Issue Creation

Issues are created with the following structure:

- **Title**: Note title (truncated to 256 characters)
- **Body**: Formatted content including author, note content, source URL, and metadata
- **Labels**: Optional default labels from connection configuration
- **Assignees**: Optional default assignees from connection configuration
- **Milestone**: Optional default milestone from connection configuration

## Configuration Schema

### Provider Configuration (GitHubConfig)

```typescript
interface GitHubConfig {
  user: {
    id: number
    login: string
    name?: string
    email?: string
    avatarUrl?: string
  }
  scope: string
}
```

### Connection Configuration (GitHubConnectionConfig)

```typescript
interface GitHubConnectionConfig {
  repositoryId: string
  repositoryName: string
  repositoryFullName: string // "owner/repo" format
  ownerName: string
  includeNoteContent: boolean
  defaultLabels?: string[] // Array of label names
  defaultAssignees?: string[] // Array of usernames
  defaultMilestone?: number // Milestone number
}
```

## Security Considerations

### Token Management

- Access tokens are encrypted using AES-256-GCM encryption
- Tokens are stored securely in the database
- No refresh token support (GitHub limitation - users must re-authenticate when tokens expire)

### Permissions

- Only repositories where the user has push permissions are available for integration
- Archived and disabled repositories are filtered out
- Connection validation ensures repository access before allowing issue creation

### Rate Limiting

- Respects GitHub's rate limiting (5,000 requests per hour for authenticated requests)
- Implements proper error handling for rate limit exceeded scenarios
- Uses pagination for repository listing to handle large numbers of repositories

## Error Handling

The provider implements comprehensive error handling for:

- OAuth authentication failures
- API rate limiting
- Repository access permission issues
- Network connectivity problems
- Invalid repository configurations
- Token expiration (requires re-authentication)

## Limitations

1. **No Refresh Token Support**: GitHub's OAuth flow doesn't provide refresh tokens, so users must re-authenticate when access tokens expire
2. **Repository Permissions**: Only repositories with push permissions are available for integration
3. **Issue Creation Only**: Currently supports creating issues but not other GitHub features like pull requests or discussions
4. **Rate Limiting**: Subject to GitHub's API rate limits which may affect high-volume usage

## Usage Examples

### Basic Issue Creation

When a note is shared to a GitHub repository, an issue is created with:

```markdown
**Author:** John Doe

**Content:**
This is the note content that will be included in the issue body.

**Source:** [View Note](https://your-app.com/notes/123)
**Change Type:** created
**Created:** 2024-01-15T10:30:00.000Z
```

### With Default Configuration

If default labels, assignees, and milestone are configured:

- Labels: `["bug", "documentation"]`
- Assignees: `["johndoe", "janedoe"]`
- Milestone: `1` (milestone number)

The created issue will automatically include these defaults.

## Architecture Compliance

The GitHub provider follows all established patterns:

- Extends `BaseIntegrationProvider` abstract class
- Implements all required `IntegrationProvider` interface methods
- Uses the same OAuth state management patterns
- Follows the same error handling and logging conventions
- Uses AES-256-GCM encryption for token storage
- Registered in the provider registry for automatic discovery

## Future Enhancements

Potential future improvements could include:

- Support for creating pull requests from notes
- Integration with GitHub Discussions
- Support for GitHub Projects (beta)
- Webhook support for bidirectional synchronization
- Support for GitHub Enterprise Server instances
- Advanced issue templating and custom fields
