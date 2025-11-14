/**
 * Storage configuration for S3-compatible storage (e.g., Tigris, AWS S3)
 */
export interface StorageConfig {
	endpoint: string
	bucket: string
	accessKey: string
	secretKey: string
	region: string
}

/**
 * Organization-specific S3 configuration from database
 */
export interface OrganizationS3Config {
	organizationId: string
	endpoint: string
	bucketName: string
	accessKeyId: string
	secretAccessKey: string // This should be encrypted in the database
	region: string
	isEnabled: boolean
}

/**
 * Function type for retrieving organization-specific storage configuration
 */
export type GetOrganizationConfigFn = (
	organizationId: string,
) => Promise<OrganizationS3Config | null>

/**
 * Function type for decrypting encrypted secrets
 */
export type DecryptFn = (encryptedValue: string) => string
