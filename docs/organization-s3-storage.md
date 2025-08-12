# Organization S3 Storage Configuration

This feature allows organizations to configure their own S3-compatible storage
instead of using the default system storage.

## Features

- **Secure Storage**: S3 credentials are encrypted before being stored in the
  database
- **Flexible Configuration**: Support for any S3-compatible storage service (AWS
  S3, DigitalOcean Spaces, MinIO, etc.)
- **Connection Testing**: Built-in connection testing to verify credentials
  before saving
- **Fallback Support**: Automatically falls back to default storage if custom
  configuration is not available
- **Per-Organization**: Each organization can have its own storage configuration

## Configuration

Organizations can configure their S3 storage from the organization settings
page:

1. Go to your organization settings (`/app/{org-slug}/settings`)
2. Navigate to the "Storage Configuration" section
3. Toggle "Enable Custom S3 Storage"
4. Fill in your S3 configuration:
   - **S3 Endpoint URL**: The S3 endpoint (e.g., `https://s3.amazonaws.com`)
   - **Region**: The AWS region (e.g., `us-east-1`)
   - **Bucket Name**: Your S3 bucket name
   - **Access Key ID**: Your S3 access key ID
   - **Secret Access Key**: Your S3 secret access key
5. Test the connection using the "Test Connection" button
6. Save the configuration

## Security

- **Encryption**: Secret access keys are encrypted using AES-256-GCM before
  being stored
- **Masked Display**: Existing secret keys are masked in the UI for security
- **Minimal Permissions**: We recommend using IAM credentials with minimal
  required permissions (read/write access to the specific bucket only)

## Environment Variables

The following environment variable is required for encryption:

```bash
ENCRYPTION_KEY="your-32-character-secret-key-here"
```

## Database Schema

The S3 configuration is stored in the `OrganizationS3Config` model:

```prisma
model OrganizationS3Config {
  id             String       @id @default(cuid())
  isEnabled      Boolean      @default(false)
  endpoint       String
  bucketName     String
  accessKeyId    String
  secretAccessKey String      // Encrypted
  region         String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  organizationId String       @unique
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

## Implementation Details

### Storage Selection Logic

The system follows this priority order when selecting storage configuration:

1. If an organization has S3 enabled and properly configured → Use
   organization's S3
2. Otherwise → Use default system storage

### File Upload Flow

When uploading files:

1. The organization ID is passed to the upload function
2. The storage utility looks up the organization's S3 configuration
3. If found and enabled, files are uploaded to the organization's S3 bucket
4. If not found or disabled, files are uploaded to the default storage

### Supported File Types

All existing file upload functions support organization-specific storage:

- Profile images
- Organization logos
- Note images
- Comment images
- Note videos
- Video thumbnails

## Migration

When enabling this feature on an existing system:

1. Existing files will remain in the default storage
2. New files will be uploaded to the organization's configured S3 storage
3. Organizations can be migrated gradually as they configure their S3 settings

## Troubleshooting

### Connection Test Fails

- Verify your S3 credentials are correct
- Ensure your bucket exists and is accessible
- Check that your IAM user has the necessary permissions
- Verify the S3 endpoint URL is correct for your provider

### Files Not Uploading

- Check the organization's S3 configuration is enabled
- Verify the bucket has write permissions
- Check server logs for detailed error messages

### Encryption Issues

- Ensure the `ENCRYPTION_KEY` environment variable is set
- Verify the encryption key is exactly 32 characters (for AES-256)
- Check that the key is consistent across all application instances
