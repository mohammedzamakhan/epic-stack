# Requirements Document

## Introduction

This document outlines the requirements for migrating the Epic Stack MCP (Model
Context Protocol) integration from API key-based authentication to OAuth 2.0
authentication. The current implementation requires users to manually create API
keys and configure them in their MCP clients (Claude Desktop, Kiro IDE, etc.).
The new OAuth-based approach will provide a more secure, user-friendly
authentication flow similar to the implementation in kentcdodds.com.

The migration involves replacing the standalone npm package (`epic-notes-mcp`)
with server-side MCP endpoints that handle OAuth authentication, eliminating the
need for users to manage API keys manually.

## Glossary

- **MCP (Model Context Protocol)**: A protocol that enables AI assistants to
  access external data sources and tools
- **MCP Server**: The server-side component that provides tools and resources to
  MCP clients
- **MCP Client**: Applications like Claude Desktop or Kiro IDE that consume MCP
  tools
- **OAuth 2.0**: An authorization framework that enables applications to obtain
  limited access to user accounts
- **Authorization Code Flow**: An OAuth 2.0 flow where the client exchanges an
  authorization code for an access token
- **Access Token**: A credential used to access protected resources on behalf of
  a user
- **Refresh Token**: A credential used to obtain new access tokens when they
  expire
- **Epic Stack Application**: The main web application that hosts user data and
  notes
- **Organization**: A workspace within the Epic Stack that contains users and
  notes
- **Session**: An authenticated user session in the Epic Stack application

## Requirements

### Requirement 1

**User Story:** As a user, I want to authenticate my MCP client using OAuth
instead of manually creating API keys, so that I can securely connect my AI
assistant to my organization data with a streamlined flow.

#### Acceptance Criteria

1. WHEN a user configures an MCP client with the Epic Stack MCP server THEN the
   system SHALL initiate an OAuth authorization flow
2. WHEN the OAuth flow completes successfully THEN the system SHALL issue an
   access token and refresh token to the MCP client
3. WHEN an MCP client presents a valid access token THEN the system SHALL
   authenticate the request and provide access to authorized tools
4. WHEN an access token expires THEN the system SHALL accept a refresh token to
   issue a new access token without requiring re-authentication
5. WHERE an MCP client is configured, WHEN the user revokes access THEN the
   system SHALL invalidate all tokens for that client

### Requirement 2

**User Story:** As a user, I want to authorize MCP access through my web
browser, so that I can leverage my existing Epic Stack session without entering
credentials again.

#### Acceptance Criteria

1. WHEN the OAuth flow begins THEN the system SHALL redirect the user to a
   web-based authorization page
2. WHILE the user has an active Epic Stack session, WHEN they access the
   authorization page THEN the system SHALL display their current session
   information
3. WHEN the user approves the authorization request THEN the system SHALL
   generate an authorization code and redirect back to the MCP client
4. WHEN the user denies the authorization request THEN the system SHALL redirect
   back to the MCP client with an error code
5. IF the user does not have an active session, THEN the system SHALL require
   login before displaying the authorization page

### Requirement 3

**User Story:** As a developer, I want the MCP server to run as part of the Epic
Stack application, so that I can eliminate the separate npm package and simplify
deployment.

#### Acceptance Criteria

1. WHEN the Epic Stack application starts THEN the system SHALL expose MCP
   endpoints at a dedicated route
2. WHEN an MCP client connects via SSE (Server-Sent Events) THEN the system
   SHALL establish a persistent connection for tool invocation
3. WHEN an MCP client sends a tool request THEN the system SHALL validate the
   access token and execute the requested tool
4. WHEN a tool execution completes THEN the system SHALL return the result to
   the MCP client in MCP protocol format
5. WHEN an MCP client disconnects THEN the system SHALL clean up the connection
   resources

### Requirement 4

**User Story:** As a user, I want to manage my MCP client authorizations, so
that I can review and revoke access for clients I no longer use.

#### Acceptance Criteria

1. WHEN a user visits the MCP settings page THEN the system SHALL display all
   authorized MCP clients
2. WHEN displaying authorized clients THEN the system SHALL show the client
   name, authorization date, and last used date
3. WHEN a user revokes an authorization THEN the system SHALL invalidate all
   tokens for that client immediately
4. WHEN a revoked client attempts to use its tokens THEN the system SHALL reject
   the request with an authentication error
5. WHEN a user authorizes a new client THEN the system SHALL add it to the list
   of authorized clients

### Requirement 5

**User Story:** As a system administrator, I want OAuth tokens to have
appropriate expiration and security controls, so that the system maintains
security best practices.

#### Acceptance Criteria

1. WHEN the system issues an access token THEN the system SHALL set an
   expiration time of 1 hour
2. WHEN the system issues a refresh token THEN the system SHALL set an
   expiration time of 30 days
3. WHEN storing tokens in the database THEN the system SHALL encrypt sensitive
   token data using AES-256-GCM
4. WHEN generating authorization codes THEN the system SHALL create
   cryptographically secure random values
5. WHEN an authorization code is used THEN the system SHALL invalidate it to
   prevent reuse

### Requirement 6

**User Story:** As a user, I want the same MCP tools available through OAuth as
were available with API keys, so that I maintain feature parity during the
migration.

#### Acceptance Criteria

1. WHEN an MCP client requests available tools THEN the system SHALL return the
   find_user and get_user_notes tools
2. WHEN a client invokes find_user with a search query THEN the system SHALL
   search for users in the authorized organization
3. WHEN a client invokes get_user_notes with a username THEN the system SHALL
   return up to 10 most recent notes for that user
4. WHEN executing tools THEN the system SHALL enforce organization-level access
   control based on the authenticated user
5. WHEN a tool execution fails THEN the system SHALL return a descriptive error
   message in MCP format

### Requirement 7

**User Story:** As a developer, I want clear migration documentation, so that
existing users can transition from API keys to OAuth smoothly.

#### Acceptance Criteria

1. WHEN the migration is complete THEN the system SHALL provide updated
   configuration examples for Claude Desktop
2. WHEN the migration is complete THEN the system SHALL provide updated
   configuration examples for Kiro IDE
3. WHEN users visit the MCP settings page THEN the system SHALL display setup
   instructions for OAuth-based configuration
4. WHEN the system detects deprecated API key usage THEN the system SHALL log a
   deprecation warning
5. WHERE backward compatibility is maintained, WHEN a client uses an API key
   THEN the system SHALL continue to function with a deprecation notice

### Requirement 8

**User Story:** As a developer, I want to implement the OAuth flow following the
MCP specification, so that the implementation is compatible with standard MCP
clients.

#### Acceptance Criteria

1. WHEN implementing the authorization endpoint THEN the system SHALL follow the
   OAuth 2.0 authorization code flow specification
2. WHEN implementing the token endpoint THEN the system SHALL support grant_type
   values of authorization_code and refresh_token
3. WHEN returning tokens THEN the system SHALL include token_type, access_token,
   refresh_token, and expires_in fields
4. WHEN an error occurs during OAuth flow THEN the system SHALL return standard
   OAuth error codes
5. WHEN implementing MCP transport THEN the system SHALL use SSE (Server-Sent
   Events) for client-to-server communication

### Requirement 9

**User Story:** As a user, I want organization-scoped MCP access, so that my MCP
client can only access data from organizations I belong to.

#### Acceptance Criteria

1. WHEN authorizing an MCP client THEN the system SHALL require the user to
   select an organization
2. WHEN the system issues tokens THEN the system SHALL associate them with the
   selected organization
3. WHEN a tool is invoked THEN the system SHALL enforce that the user has access
   to the token's associated organization
4. WHEN a user loses access to an organization THEN the system SHALL invalidate
   all MCP tokens for that organization
5. WHEN displaying authorized clients THEN the system SHALL show which
   organization each client is authorized for
