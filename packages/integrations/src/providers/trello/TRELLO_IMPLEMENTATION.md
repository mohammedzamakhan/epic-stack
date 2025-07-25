# Trello Integration Implementation

This document outlines the implementation of the Trello integration provider for
connecting notes to Trello boards and creating cards from note content.

## Overview

The Trello integration allows users to:

- Connect their Trello account via OAuth 1.0a authentication
- Browse available boards and lists as channels
- Create cards in selected lists when notes are shared
- Configure default labels and members for created cards
- Include note content and metadata in card descriptions

## OAuth Flow

Trello uses OAuth 1.0a authentication, which is more complex than OAuth 2.0:

### Authentication Endpoints

- **Request Token URL**: `https://trello.com/1/OAuthGetRequestToken`
- **Authorization URL**: `https://trello.com/1/authorize`
- **Access Token URL**: `https://trello.com/1/OAuthGetAccessToken`

### OAuth Parameters

- **Scopes**: `read,write,account` (comma-separated)
- **Expiration**: `never` (recommended for persistent access)
- **Response Type**: `fragment`

### Implementation Notes

- Requires OAuth 1.0a signature generation using HMAC-SHA1
- Request tokens must be stored temporarily during the auth flow
- Access tokens don't expire by default when set to "never"

## API Integration

### Base Configuration

- **API Base URL**: `https://api.trello.com/1`
- **Authentication**: API key + token in query parameters
- **Rate Limiting**: 300 requests per 10 seconds per API key

### Key Endpoints Used

- `GET /members/me` - Get current user information
- `GET /members/me/boards` - List user's accessible boards
- `GET /boards/{id}/lists` - Get lists within a board
- `POST /cards` - Create new cards
- `GET /lists/{id}` - Validate list access

### Data Models

#### User Information

```typescript
interface TrelloUser {
	id: string
	username: string
	fullName: string
	email?: string
	avatarUrl?: string
	url: string
}
```

#### Board Structure

```typescript
interface TrelloBoard {
	id: string
	name: string
	url: string
	closed: boolean
	desc: string
	prefs: {
		permissionLevel: string
		background: string
	}
}
```

#### List Structure

```typescript
interface TrelloList {
	id: string
	name: string
	closed: boolean
	pos: number
	idBoard: string
}
```

## Configuration Schema

### Provider Configuration

```typescript
interface TrelloConfig {
	user: {
		id: string
		username: string
		fullName: string
		email?: string
		avatarUrl?: string
	}
	boards: Array<{
		id: string
		name: string
		url: string
	}>
}
```

### Connection Configuration

```typescript
interface TrelloConnectionConfig {
	listId: string
	listName: string
	boardName: string
	includeNoteContent: boolean
	defaultLabels?: string[]
	defaultMembers?: string[]
}
```

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Trello Integration OAuth Configuration
# Get these from https://trello.com/app-key
TRELLO_API_KEY="your-trello-api-key"
TRELLO_API_SECRET="your-trello-api-secret"
```

## Setup Instructions

### 1. Create Trello Application

1. Visit [https://trello.com/app-key](https://trello.com/app-key)
2. Generate your API key and secret
3. Note your API key and secret for environment variables

### 2. Configure OAuth Application

1. The API key serves as your client identifier
2. The API secret is used for OAuth 1.0a signature generation
3. Configure your callback URL in your application settings

### 3. Environment Setup

Add the Trello credentials to your environment:

```bash
TRELLO_API_KEY="your-api-key-here"
TRELLO_API_SECRET="your-api-secret-here"
```

## Features

### Channel Discovery

- Lists all accessible boards and their lists
- Displays as "Board Name / List Name" for clarity
- Filters out closed boards and lists
- Includes board metadata for context

### Card Creation

- Creates cards with note title as card name
- Includes rich description with:
  - Note author information
  - Note content (if enabled)
  - Source URL link back to original note
  - Change type indicator
- Supports default labels and member assignments
- Maintains link back to original note

### Connection Validation

- Validates access to specified lists
- Checks token validity
- Handles API errors gracefully

## Error Handling

The integration includes comprehensive error handling for:

- OAuth authentication failures
- API rate limiting
- Invalid tokens or expired access
- Network connectivity issues
- Malformed API responses
- Permission denied errors

## Security Considerations

- OAuth 1.0a signature generation for secure authentication
- Encrypted token storage using AES-256-GCM
- API key and secret stored as environment variables
- Rate limiting compliance to prevent API abuse
- Proper error handling to avoid exposing sensitive information

## Limitations

- OAuth 1.0a implementation is more complex than OAuth 2.0
- Requires proper request token storage during auth flow
- API rate limiting may affect high-volume usage
- Cards can only be created in lists, not directly on boards
- Limited to boards where user has write permissions

## Future Enhancements

Potential improvements for the Trello integration:

- Support for card due dates and checklists
- Advanced label and member management
- Board template support
- Webhook integration for real-time updates
- Bulk card operations
- Custom field support
- Card archiving and deletion capabilities
