import { brand } from '@repo/config/brand'

export const APP_NAME = `${brand.name} Mobile`
export const APP_VERSION = '1.0.0'

// API Configuration
export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'

// Storage keys
export const STORAGE_KEYS = {
	SESSION: 'user_session',
	REFRESH_TOKEN: 'refresh_token',
	USER_PREFERENCES: 'user_preferences',
} as const

// OAuth providers
export const OAUTH_PROVIDERS = {
	GOOGLE: 'google',
	GITHUB: 'github',
} as const
