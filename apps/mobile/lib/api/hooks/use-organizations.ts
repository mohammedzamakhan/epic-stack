import { useState, useEffect } from 'react'
import { useAuth } from '../../auth/hooks/use-auth'
import { jwtAuthApi } from '../index'
import type { UserOrganization } from '@repo/types'

export function useOrganizations() {
  const { user, isAuthenticated } = useAuth()
  const [organizations, setOrganizations] = useState<UserOrganization[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizations = async () => {
    if (!isAuthenticated || !user) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await jwtAuthApi.getOrganizations()
      if (response.success && response.data) {
        setOrganizations(response.data.organizations)
      } else {
        setError('message' in response ? response.message : 'Failed to fetch organizations')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrganizations()
  }, [])

  return {
    organizations,
    isLoading,
    error,
    refetch: fetchOrganizations,
  }
}