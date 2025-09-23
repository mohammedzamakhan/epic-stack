import { router } from 'expo-router'

/**
 * Handle deep link URLs for authentication flows
 */
export const handleDeepLink = (url: string): void => {
	try {
		console.log('Handling deep link:', url)

		// Handle different URL formats (custom scheme vs http)
		let pathname: string
		let searchParams: URLSearchParams

		if (url.startsWith('http')) {
			// HTTP URL format
			const parsedUrl = new URL(url)
			pathname = parsedUrl.pathname
			searchParams = parsedUrl.searchParams
		} else {
			// Custom scheme format (myapp://path?params)
			const [, rest] = url.split('://')
			if (!rest) {
				console.warn('Invalid deep link format:', url)
				return
			}

			const [pathPart, queryPart] = rest.split('?')
			pathname = pathPart ? `/${pathPart}` : ''
			searchParams = new URLSearchParams(queryPart || '')
		}

		console.log('Parsed deep link:', {
			pathname,
			params: Object.fromEntries(searchParams),
		})

		// Handle verification links
		if (pathname.includes('verify') || searchParams.has('type')) {
			const type = searchParams.get('type')
			const target = searchParams.get('target')
			const code = searchParams.get('code')
			const redirectTo = searchParams.get('redirectTo')

			if (type && target && code) {
				// Navigate to verification screen with pre-filled data
				const params = new URLSearchParams({
					type,
					target,
					code,
					...(redirectTo && { redirectTo }),
				}).toString()

				console.log('Navigating to verify-code with params:', params)
				router.replace(`/(auth)/verify-code?${params}` as any)
				return
			}
		}

		// Handle OAuth callback
		if (pathname.includes('callback')) {
			console.log('Navigating to OAuth callback')
			router.replace('/auth/callback' as any)
			return
		}

		// Handle other auth-related deep links
		if (
			pathname.includes('auth') ||
			pathname.includes('sign-in') ||
			pathname.includes('sign-up')
		) {
			let authPath = pathname.replace('/auth/', '').replace('/', '')

			// Map common paths
			if (authPath === 'sign-in' || pathname.includes('sign-in')) {
				authPath = 'sign-in'
			} else if (authPath === 'sign-up' || pathname.includes('sign-up')) {
				authPath = 'sign-up'
			}

			if (authPath) {
				console.log('Navigating to auth path:', authPath)
				router.replace(`/(auth)/${authPath}` as any)
				return
			}
		}

		// Default fallback - let AuthGuard handle it
		console.log('Deep link will be handled by AuthGuard')
	} catch (error) {
		console.warn('Failed to parse deep link URL:', url, error)
		// Fallback to sign in on invalid URLs
		navigateToSignIn()
	}
}

/**
 * Navigate to the appropriate screen after successful authentication
 */
export const navigateAfterAuth = (redirectTo?: string): void => {
	console.log(
		'🧭 Navigation: navigateAfterAuth called with redirectTo:',
		redirectTo,
	)

	if (redirectTo) {
		console.log('🧭 Navigation: Redirecting to specific URL:', redirectTo)
		// If there's a specific redirect URL, navigate there
		router.replace(redirectTo as any)
	} else {
		console.log('🧭 Navigation: Redirecting to dashboard screen')
		// Default to the main app screen (dashboard)
		router.replace('/(dashboard)')
	}
}

/**
 * Navigate to sign in screen
 */
export const navigateToSignIn = (redirectTo?: string): void => {
	const params = redirectTo
		? `?redirectTo=${encodeURIComponent(redirectTo)}`
		: ''
	router.replace(`/(auth)/sign-in${params}` as any)
}

/**
 * Navigate to sign up screen
 */
export const navigateToSignUp = (redirectTo?: string): void => {
	const params = redirectTo
		? `?redirectTo=${encodeURIComponent(redirectTo)}`
		: ''
	router.replace(`/(auth)/sign-up${params}` as any)
}

/**
 * Navigate back in the navigation stack
 */
export const navigateBack = (): void => {
	if (router.canGoBack()) {
		router.back()
	} else {
		// Fallback to sign in if can't go back
		navigateToSignIn()
	}
}
