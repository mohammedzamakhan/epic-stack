# Implementation Plan

- [x] 1. Database schema migration
  - Create Prisma models for MCPAuthorization, MCPAccessToken, and
    MCPRefreshToken
  - Add relations to User and Organization models
  - Generate and run database migration
  - Verify schema in development environment
  - _Requirements: 1.1, 1.2, 4.1, 9.1, 9.2_

- [x] 1.1 Write property test for token storage
  - **Property 16: Token storage encryption**
  - **Validates: Requirements 5.3**

- [x] 2. Implement OAuth service layer
  - Create `app/utils/mcp-oauth.server.ts` with token generation functions
  - Implement authorization code creation and caching
  - Implement token exchange (authorization code → access + refresh tokens)
  - Implement token refresh flow
  - Implement token validation
  - Implement authorization revocation
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2, 5.4, 5.5_

- [x] 2.1 Write property test for token issuance
  - **Property 2: Token issuance completeness**
  - **Validates: Requirements 1.2, 5.1, 5.2**

- [x] 2.2 Write property test for token refresh
  - **Property 4: Token refresh round trip**
  - **Validates: Requirements 1.4**

- [x] 2.3 Write property test for authorization revocation
  - **Property 5: Authorization revocation completeness**
  - **Validates: Requirements 1.5, 4.3**

- [x] 2.4 Write property test for authorization code uniqueness
  - **Property 17: Authorization code uniqueness and entropy**
  - **Validates: Requirements 5.4**

- [x] 2.5 Write property test for authorization code single use
  - **Property 18: Authorization code single use**
  - **Validates: Requirements 5.5**

- [x] 2.6 Write unit tests for OAuth service
  - Test token generation produces unique values
  - Test token hashing consistency
  - Test authorization code lifecycle
  - Test error scenarios (invalid codes, expired tokens)
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3. Implement MCP server service
  - Create `app/utils/mcp-server.server.ts` with tool registry
  - Implement tool registration function
  - Implement tool execution with context
  - Implement MCP request handler (tools/list, tools/call)
  - Add error handling for unknown tools and invalid arguments
  - _Requirements: 3.3, 3.4, 6.1_

- [x] 3.1 Write property test for tool execution
  - **Property 10: Tool request validation and execution**
  - **Validates: Requirements 3.3, 3.4**

- [x] 3.2 Write property test for tool error format
  - **Property 22: Tool error format compliance**
  - **Validates: Requirements 6.5**

- [x] 3.3 Write unit tests for MCP server service
  - Test tool registration
  - Test tool execution with mocked context
  - Test request routing
  - Test error handling
  - _Requirements: 3.3, 3.4, 6.1_

- [x] 4. Migrate MCP tools to new service
  - Create `app/utils/mcp-tools.server.ts`
  - Migrate find_user tool with organization scoping
  - Migrate get_user_notes tool with access control
  - Register tools with MCP server service
  - Add helper functions (getUserBase64Image)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.1 Write property test for organization-scoped user search
  - **Property 19: Organization-scoped user search**
  - **Validates: Requirements 6.2**

- [x] 4.2 Write property test for note retrieval
  - **Property 20: Note retrieval limits and ordering**
  - **Validates: Requirements 6.3**

- [x] 4.3 Write property test for organization access control
  - **Property 21: Organization access control**
  - **Validates: Requirements 6.4**

- [x] 4.4 Write property test for cross-organization access prevention
  - **Property 28: Cross-organization access prevention**
  - **Validates: Requirements 9.3**

- [x] 4.5 Write unit tests for MCP tools
  - Test find_user with various queries
  - Test get_user_notes with various usernames
  - Test access control enforcement
  - Test error cases (user not found, no notes)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement OAuth authorization endpoint
  - Create route `app/routes/mcp+/authorize.tsx`
  - Implement loader to check user session
  - Redirect to login if no session (with return URL)
  - Display authorization UI with organization selection
  - Implement action to handle approval/denial
  - Generate authorization code on approval
  - Redirect to client with code or error
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1_

- [x] 6.1 Write property test for session-based redirect
  - **Property 6: Session-based authorization redirect**
  - **Validates: Requirements 2.1, 2.5**

- [x] 6.2 Write property test for authorization approval
  - **Property 7: Authorization approval code generation**
  - **Validates: Requirements 2.3**

- [x] 6.3 Write property test for authorization denial
  - **Property 8: Authorization denial error response**
  - **Validates: Requirements 2.4**

- [x] 6.4 Write property test for organization selection requirement
  - **Property 26: Organization selection requirement**
  - **Validates: Requirements 9.1**

- [x] 7. Implement OAuth token endpoint
  - Create route `app/routes/mcp+/token.ts`
  - Implement authorization_code grant type
  - Implement refresh_token grant type
  - Validate grant type and parameters
  - Return tokens with proper structure (token_type, access_token,
    refresh_token, expires_in)
  - Return standard OAuth error codes for failures
  - _Requirements: 1.2, 1.4, 8.2, 8.3, 8.4_

- [x] 7.1 Write property test for token response structure
  - **Property 24: Token response structure**
  - **Validates: Requirements 8.3**

- [x] 7.2 Write property test for OAuth error codes
  - **Property 25: OAuth error code standards**
  - **Validates: Requirements 8.4**

- [x] 7.3 Write integration tests for token endpoint
  - Test authorization code exchange
  - Test refresh token exchange
  - Test invalid grant types
  - Test expired codes
  - Test invalid tokens
  - _Requirements: 1.2, 1.4, 8.2, 8.3, 8.4_

- [x] 8. Implement MCP SSE endpoint
  - Create route `app/routes/mcp+/sse.ts`
  - Validate access token from request
  - Establish SSE connection with proper headers
  - Implement message handler for tool invocations
  - Implement connection cleanup on disconnect
  - Handle token expiration during connection
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.1 Write property test for SSE connection persistence
  - **Property 9: SSE connection persistence**
  - **Validates: Requirements 3.2**

- [x] 8.2 Write property test for connection cleanup
  - **Property 11: Connection resource cleanup**
  - **Validates: Requirements 3.5**

- [x] 8.3 Write property test for valid token authentication
  - **Property 3: Valid token authentication**
  - **Validates: Requirements 1.3**

- [x] 8.4 Write integration tests for SSE endpoint
  - Test connection establishment with valid token
  - Test tool invocation through SSE
  - Test connection rejection with invalid token
  - Test connection cleanup on disconnect
  - Test token expiration handling
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. Update MCP settings page UI
  - Update `app/routes/_app+/$orgSlug_+/mcp.tsx`
  - Remove API key creation UI
  - Add authorized clients list with client name, date, last used
  - Add revoke button for each authorization
  - Update setup instructions for OAuth flow
  - Add configuration examples for Claude Desktop and Kiro IDE
  - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 7.3_

- [x] 9.1 Write property test for authorization list completeness
  - **Property 12: Authorization list completeness**
  - **Validates: Requirements 4.1**

- [x] 9.2 Write property test for authorization display fields
  - **Property 13: Authorization display fields**
  - **Validates: Requirements 4.2**

- [x] 9.3 Write property test for authorization list growth
  - **Property 15: Authorization list growth**
  - **Validates: Requirements 4.5**

- [x] 10. Implement authorization revocation
  - Add revoke action to MCP settings page
  - Call OAuth service revocation function
  - Update UI to remove revoked authorization
  - Add confirmation dialog for revocation
  - _Requirements: 1.5, 4.3, 4.4_

- [x] 10.1 Write property test for revoked token rejection
  - **Property 14: Revoked token rejection**
  - **Validates: Requirements 4.4**

- [x] 10.2 Write property test for organization access revocation
  - **Property 29: Organization access revocation cascade**
  - **Validates: Requirements 9.4**

- [x] 11. Implement token-organization association
  - Ensure tokens are created with organization association
  - Enforce organization scoping in tool execution
  - Add organization display in authorized clients list
  - _Requirements: 9.2, 9.3, 9.5_

- [x] 11.1 Write property test for token-organization association
  - **Property 27: Token-organization association**
  - **Validates: Requirements 9.2**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Status: All tests passing
    - mcp-oauth.server.test.ts: 21 tests passed ✓
    - mcp-server.server.test.ts: 16 tests passed ✓
    - authorize.test.ts: 9 tests passed ✓
    - token.test.ts: 12 tests passed ✓
    - sse.test.ts: 12 tests passed ✓
    - mcp.test.ts: 7 tests passed ✓
    - Total: 77 tests passed

- [x] 12.1 Add streamableHttp transport support to SSE endpoint
  - Add action function to handle POST requests for streamableHttp transport
  - Implement bidirectional JSON-RPC communication over HTTP
  - Support MCP protocol messages (initialize, tools/list, tools/call)
  - Maintain backward compatibility with SSE transport (GET requests)
  - Add proper error handling for malformed requests
  - Return plain text "Unauthorized" for unauthenticated requests (matches
    kentcdodds.com pattern)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1_
  - _Issue: Cursor IDE was receiving HTML instead of plain text for 401
    responses_
  - _Fix: Changed 401 responses to return plain text instead of JSON to match
    MCP OAuth pattern_

- [x] 12.2 Write integration tests for streamableHttp transport
  - Test POST request handling for MCP messages
  - Test initialize handshake
  - Test tools/list request
  - Test tools/call request
  - Test error responses
  - _Requirements: 3.3, 3.4_

- [x] 13. Add rate limiting and security controls
  - Implement rate limiting on authorization endpoint (10 per hour per user)
  - Implement rate limiting on token endpoint (20 per hour per IP)
  - Implement rate limiting on tool invocations (1000 per hour per token)
  - Add audit logging for authorization events
  - Add audit logging for token issuance and refresh
  - Add audit logging for revocations
  - _Requirements: 5.3, 5.4_

- [x] 13.1 Write integration tests for rate limiting
  - Test authorization rate limit enforcement
  - Test token endpoint rate limit enforcement
  - Test tool invocation rate limit enforcement
  - _Requirements: 5.3_

- [x] 14. Implement token cleanup job using background jobs package based on
      trigger.dev
  - Create background job to delete expired access tokens
  - Create background job to delete expired refresh tokens
  - Schedule job to run daily
  - Add logging for cleanup operations
  - _Requirements: 5.1, 5.2_

- [x] 15. Security audit
  - Verify tokens are never stored in plaintext
  - Verify authorization codes expire correctly
  - Verify token expiration times are correct
  - Verify rate limiting is enforced
  - Verify audit logs capture all events
  - Verify CORS configuration
  - Verify CSRF protection
  - Verify error messages don't leak sensitive info
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
