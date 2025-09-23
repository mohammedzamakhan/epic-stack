import { useContext } from 'react'
import { AuthContext } from '../auth-context'
import type { AuthContextType } from '../types'

/**
 * Hook for accessing authentication state and actions
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
	const context = useContext(AuthContext)

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}

	return context
}
