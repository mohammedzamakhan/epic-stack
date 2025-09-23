// App constants
export const APP_NAME = 'Epic Stack Mobile'
export const APP_VERSION = '1.0.0'

// API Configuration
export const API_BASE_URL =
	process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

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
