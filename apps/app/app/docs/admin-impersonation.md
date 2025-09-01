# Admin User Impersonation System

## Overview

The admin impersonation system allows administrators to temporarily log in as
other users for troubleshooting and support purposes. This feature includes
proper session management, audit logging, and security controls.

## Features

### 1. Impersonation Action

- **Route**: `/admin/users/{userId}/impersonate`
- **Method**: POST
- **Access**: Admin role required
- **Functionality**:
  - Creates a new session for the target user
  - Stores impersonation metadata in the admin's session
  - Prevents impersonation of banned users (unless ban has expired)
  - Redirects to main application as the impersonated user

### 2. Impersonation Banner

- **Component**: `ImpersonationBanner`
- **Location**: Displayed at the top of all pages when impersonating
- **Information Shown**:
  - Clear indication that impersonation is active
  - Name of the user being impersonated
  - Duration of impersonation session
  - Quick "Stop Impersonation" button

### 3. Stop Impersonation

- **Route**: `/admin/stop-impersonation`
- **Method**: POST
- **Functionality**:
  - Ends the impersonation session
  - Creates a new admin session
  - Logs the end of impersonation for audit purposes
  - Redirects back to admin dashboard

### 4. Audit Logging

- **Storage**: Uses organization notes and activity logs
- **Organization**: Creates/uses "admin-system" organization for audit logs
- **Events Logged**:
  - `ADMIN_IMPERSONATION_START`: When impersonation begins
  - `ADMIN_IMPERSONATION_END`: When impersonation ends
- **Metadata Includes**:
  - Admin user information
  - Target user information
  - Timestamps
  - Session IDs
  - Duration (for end events)

### 5. Audit Log Viewer

- **Route**: `/admin/audit-logs`
- **Access**: Admin role required
- **Features**:
  - View recent impersonation activities
  - Filter by action type
  - See duration and timestamps
  - Admin and target user information

## Security Features

1. **Role-based Access**: Only users with 'admin' role can impersonate
2. **Banned User Protection**: Cannot impersonate currently banned users
3. **Session Management**: Proper session creation and cleanup
4. **Audit Trail**: Complete logging of all impersonation activities
5. **Clear Indicators**: Obvious UI indicators when impersonation is active

## Usage

### For Admins

1. Navigate to `/admin/users`
2. Find the user you need to impersonate
3. Click on the user to view their details
4. Click the "Impersonate" button
5. You'll be redirected to the main app as that user
6. A yellow banner will appear at the top indicating impersonation is active
7. To stop impersonating, click "Stop Impersonation" in the banner

### Audit Review

1. Navigate to `/admin/audit-logs`
2. Review recent impersonation activities
3. Check duration and details of each session

## Technical Implementation

### Session Management

- Uses existing `authSessionStorage` for session handling
- Stores impersonation metadata in session cookie
- Creates new sessions for both impersonation start and end

### Database Schema

- Leverages existing user ban fields (`isBanned`, `banExpiresAt`, etc.)
- Uses organization notes for audit log storage
- Activity logs store detailed metadata as JSON

### Components

- `ImpersonationBanner`: Top-level UI indicator
- `AdminUserDetail`: Updated with impersonation button
- `AdminAuditLogs`: Dedicated audit log viewer

## Testing

The system includes comprehensive tests covering:

- Successful impersonation flow
- Access control (non-admins blocked)
- Banned user protection
- Session management
- Audit logging

## Future Enhancements

Potential improvements could include:

- Time-limited impersonation sessions
- More granular permissions
- Enhanced audit log filtering
- Email notifications for impersonation events
- Integration with external audit systems
