import { useState, useCallback } from 'react'
import { jwtAuthApi } from '../index'

export interface CreateOrganizationData {
	name: string
	slug: string
	description?: string
}

export interface CreatedOrganization {
	id: string
	name: string
	slug: string
	description?: string | null
}

export function useCreateOrganization() {
	const [isCreating, setIsCreating] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const createOrganization = useCallback(
		async (data: CreateOrganizationData) => {
			setIsCreating(true)
			setError(null)

			try {
				const response = await jwtAuthApi.createOrganization(data)
				if (response.success && response.data) {
					return {
						success: true,
						organization: response.data.organization,
					}
				} else {
					const errorMessage =
						'message' in response
							? response.message
							: 'Failed to create organization'
					setError(errorMessage ?? 'Failed to create organization')
					return { success: false, error: errorMessage }
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'An unexpected error occurred'
				setError(errorMessage)
				return { success: false, error: errorMessage }
			} finally {
				setIsCreating(false)
			}
		},
		[],
	)

	return {
		isCreating,
		error,
		createOrganization,
		clearError: () => setError(null),
	}
}
