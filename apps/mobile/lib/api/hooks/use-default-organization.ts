import { useState, useCallback } from 'react'
import { jwtAuthApi } from '../index'

export function useDefaultOrganization() {
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const setDefaultOrganization = useCallback(async (organizationId: string) => {
		setIsUpdating(true)
		setError(null)

		try {
			const response = await jwtAuthApi.setDefaultOrganization(organizationId)
			if (response.success) {
				return { success: true }
			} else {
				const errorMessage =
					'message' in response
						? response.message
						: 'Failed to set default organization'
				setError(errorMessage ?? 'Failed to set default organization')
				return { success: false, error: errorMessage }
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'An unexpected error occurred'
			setError(errorMessage)
			return { success: false, error: errorMessage }
		} finally {
			setIsUpdating(false)
		}
	}, [])

	return {
		isUpdating,
		error,
		setDefaultOrganization,
		clearError: () => setError(null),
	}
}
