import { TokenData } from '../../types'

export interface StorageError extends Error {
	code:
		| 'STORAGE_ERROR'
		| 'ENCRYPTION_ERROR'
		| 'DECRYPTION_ERROR'
		| 'KEY_NOT_FOUND'
}

export enum StorageKeys {
	TOKEN_DATA = 'token_data',
	USER_DATA = 'user_data',
	USER_PREFERENCES = 'user_preferences',
	BIOMETRIC_ENABLED = 'biometric_enabled',
}

export interface TokenValidationResult {
	isValid: boolean
	isExpired: boolean
	needsRefresh: boolean
	tokens: TokenData | null
}

export interface TokenRefreshOptions {
	refreshToken: string
	userId: string
	onRefreshSuccess?: (newTokens: TokenData) => void
	onRefreshFailure?: (error: Error) => void
}
