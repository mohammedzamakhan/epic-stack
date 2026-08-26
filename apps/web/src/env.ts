// Simple environment configuration for Cloudflare deployment
// This replaces varlock temporarily for Cloudflare compatibility

export const ENV = {
	DEV: import.meta.env.DEV || false,
} as const
