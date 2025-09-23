// Re-export types that will be shared with other packages
export interface User {
	id: string
	email: string
	username: string
	name?: string
	image?: string
	createdAt: string
	updatedAt: string
}

export interface TokenData {
	accessToken: string
	refreshToken: string
	expiresIn: number
	expiresAt: string
}

export interface AuthState {
	user: User | null
	tokens: TokenData | null
	isLoading: boolean
	error: string | null
}

export interface LoginCredentials {
	username: string
	password: string
	remember?: boolean
	redirectTo?: string
}

export interface AuthResponse {
	success: boolean
	data?: {
		user: User
		accessToken: string
		refreshToken: string
		expiresIn: number
		expiresAt: string
	}
	error?: string
	message?: string
}
