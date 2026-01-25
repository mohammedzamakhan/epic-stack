import React from 'react'

/**
 * Utility functions for tracking the last used login method in localStorage
 */

export type LoginMethod = 'password' | 'passkey' | 'github' | 'google' | 'sso'

const LAST_LOGIN_METHOD_KEY = 'lastLoginMethod'

/**
 * Save the last used login method to localStorage
 */
export function saveLastLoginMethod(method: LoginMethod): void {
	if (typeof window !== 'undefined') {
		try {
			localStorage.setItem(LAST_LOGIN_METHOD_KEY, method)
		} catch (error) {
			// Silently fail if localStorage is not available
			console.warn('Failed to save last login method:', error)
		}
	}
}

/**
 * Get the last used login method from localStorage
 */
function getLastLoginMethod(): LoginMethod | null {
	if (typeof window !== 'undefined') {
		try {
			const method = localStorage.getItem(LAST_LOGIN_METHOD_KEY)
			if (method && isValidLoginMethod(method)) {
				return method as LoginMethod
			}
		} catch (error) {
			// Silently fail if localStorage is not available
			console.warn('Failed to get last login method:', error)
		}
	}
	return null
}

/**
 * Check if a string is a valid login method
 */
function isValidLoginMethod(method: string): method is LoginMethod {
	return ['password', 'passkey', 'github', 'google', 'sso'].includes(method)
}

/**
 * Hook to get the last login method (for React components)
 */
export function useLastLoginMethod(): LoginMethod | null {
	// Use a simple state approach since this is just for display
	const [lastMethod, setLastMethod] = React.useState<LoginMethod | null>(null)

	React.useEffect(() => {
		setLastMethod(getLastLoginMethod())
	}, [])

	if (typeof window === 'undefined') {
		return null
	}

	return lastMethod
}
