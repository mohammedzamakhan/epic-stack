import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from './use-auth'

/**
 * Hook for protecting routes that require authentication
 * Redirects to sign-in if user is not authenticated
 */
export function useAuthGuard(options?: {
	redirectTo?: string
	requireAuth?: boolean
}) {
	const { isAuthenticated, isLoading, user } = useAuth()
	const router = useRouter()

	const { redirectTo = '/(auth)/sign-in', requireAuth = true } = options || {}

	useEffect(() => {
		// Don't redirect while loading
		if (isLoading) return

		if (requireAuth && !isAuthenticated) {
			router.replace(redirectTo as any)
		}
	}, [isAuthenticated, isLoading, requireAuth, redirectTo, router])

	return {
		isAuthenticated,
		isLoading,
		user,
		canAccess: !requireAuth || isAuthenticated,
	}
}

/**
 * Hook for protecting routes that should only be accessible to unauthenticated users
 * Redirects authenticated users to the main app
 */
export function useGuestGuard(options?: { redirectTo?: string }) {
	const { isAuthenticated, isLoading, user } = useAuth()
	const router = useRouter()

	const { redirectTo = '/(tabs)' } = options || {}

	useEffect(() => {
		// Don't redirect while loading
		if (isLoading) return

		if (isAuthenticated) {
			router.replace(redirectTo as any)
		}
	}, [isAuthenticated, isLoading, redirectTo, router])

	return {
		isAuthenticated,
		isLoading,
		user,
		canAccess: !isAuthenticated,
	}
}

/**
 * Hook for conditional authentication guard
 * Allows for more complex authentication logic
 */
export function useConditionalAuthGuard(
	condition: (user: any, isAuthenticated: boolean) => boolean,
	options?: {
		redirectTo?: string
		onRedirect?: () => void
	},
) {
	const { isAuthenticated, isLoading, user } = useAuth()
	const router = useRouter()

	const { redirectTo = '/(auth)/sign-in', onRedirect } = options || {}

	useEffect(() => {
		// Don't redirect while loading
		if (isLoading) return

		const shouldRedirect = !condition(user, isAuthenticated)

		if (shouldRedirect) {
			onRedirect?.()
			router.replace(redirectTo as any)
		}
	}, [
		isAuthenticated,
		isLoading,
		user,
		condition,
		redirectTo,
		onRedirect,
		router,
	])

	return {
		isAuthenticated,
		isLoading,
		user,
		canAccess: condition(user, isAuthenticated),
	}
}

/**
 * Hook for role-based authentication guard
 * Protects routes based on user roles or permissions
 */
export function useRoleGuard(
	allowedRoles: string[],
	options?: {
		redirectTo?: string
		getUserRole?: (user: any) => string | string[]
	},
) {
	const { isAuthenticated, isLoading, user } = useAuth()
	const router = useRouter()

	const {
		redirectTo = '/(auth)/sign-in',
		getUserRole = (user: any) => user?.role || [],
	} = options || {}

	const hasAccess = () => {
		if (!isAuthenticated || !user) return false

		const userRoles = getUserRole(user)
		const roles = Array.isArray(userRoles) ? userRoles : [userRoles]

		return allowedRoles.some((role) => roles.includes(role))
	}

	useEffect(() => {
		// Don't redirect while loading
		if (isLoading) return

		if (!hasAccess()) {
			router.replace(redirectTo as any)
		}
	}, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, router])

	return {
		isAuthenticated,
		isLoading,
		user,
		canAccess: hasAccess(),
		userRoles: user ? getUserRole(user) : [],
	}
}
