import { useState, useCallback } from 'react'
import { useAuth } from '../../auth/hooks/use-auth'
import { jwtAuthApi } from '../index'

export interface UpdateProfileData {
	name?: string
	username: string
}

export function useProfile() {
	const { user } = useAuth()
	const [isUpdating, setIsUpdating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const updateProfile = useCallback(async (data: UpdateProfileData) => {
		setIsUpdating(true)
		setError(null)

		try {
			const response = await jwtAuthApi.updateProfile(data)
			if (response.success) {
				return { success: true }
			} else {
				const errorMessage =
					'message' in response ? response.message : 'Failed to update profile'
				setError(errorMessage ?? 'Failed to update profile')
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
		user,
		isUpdating,
		error,
		updateProfile,
		clearError: () => setError(null),
	}
}
