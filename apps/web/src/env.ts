// Simple environment configuration for Cloudflare deployment
// This replaces varlock temporarily for Cloudflare compatibility

export const ENV = {
	PUBLIC_CMS_URL: import.meta.env.PUBLIC_CMS_URL || 'http://localhost:2999',
	DEV: import.meta.env.DEV || false,
} as const
