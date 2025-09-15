import React from 'react'
import { render, act } from '@testing-library/react-native'
import { AuthGuard } from '../auth-guard'

// Mock expo-router
const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  useSegments: jest.fn(),
  useRootNavigationState: jest.fn(),
  useLocalSearchParams: jest.fn(),
}))

// Mock auth hook
const mockUseAuth = jest.fn()
jest.mock('../../lib/auth/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('AuthGuard', () => {
  const mockUseSegments = require('expo-router').useSegments
  const mockUseRootNavigationState = require('expo-router').useRootNavigationState
  const mockUseLocalSearchParams = require('expo-router').useLocalSearchParams

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseSegments.mockReturnValue([])
    mockUseRootNavigationState.mockReturnValue({ key: 'test' })
    mockUseLocalSearchParams.mockReturnValue({})
  })

  it('should not redirect while loading', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
    })

    render(<AuthGuard />)

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('should redirect unauthenticated user from dashboard to sign-in', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })
    mockUseSegments.mockReturnValue(['(dashboard)'])

    render(<AuthGuard />)

    // Wait for navigation to be ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/sign-in',
      params: { redirectTo: '/(dashboard)' },
    })
  })

  it('should redirect authenticated user from auth to dashboard', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    })
    mockUseSegments.mockReturnValue(['(auth)', 'sign-in'])

    render(<AuthGuard />)

    // Wait for navigation to be ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(mockReplace).toHaveBeenCalledWith('/(dashboard)')
  })

  it('should redirect authenticated user to specified redirectTo', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    })
    mockUseSegments.mockReturnValue(['(auth)', 'sign-in'])
    mockUseLocalSearchParams.mockReturnValue({
      redirectTo: '/(dashboard)/profile',
    })

    render(<AuthGuard />)

    // Wait for navigation to be ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(mockReplace).toHaveBeenCalledWith('/(dashboard)/profile')
  })

  it('should not redirect during OAuth callback', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })
    mockUseSegments.mockReturnValue(['auth', 'callback'])

    render(<AuthGuard />)

    // Wait for navigation to be ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('should redirect from index screen based on auth state', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })
    mockUseSegments.mockReturnValue(['index'])

    render(<AuthGuard />)

    // Wait for navigation to be ready
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
    })

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in')
  })
})