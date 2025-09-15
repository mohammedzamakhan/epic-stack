// Export both the original auth API and the new JWT auth API
export { AuthApi, createAuthApi, createDefaultAuthApi } from './auth-api'
export { JWTAuthApi, createJWTAuthApi, createDefaultJWTAuthApi } from './jwt-auth-api'
export { JWTHttpClient } from './jwt-http-client'

// Create the default JWT auth API instance
import { createDefaultJWTAuthApi } from './jwt-auth-api'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

// Export the JWT auth API instance for use throughout the app
export const jwtAuthApi = createDefaultJWTAuthApi(API_BASE_URL)

// Keep the original auth API for backward compatibility
export { authApi } from './auth-api'