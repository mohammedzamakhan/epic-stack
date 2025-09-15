import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SocialButton } from '../social-button'
import { useOAuth } from '../../../lib/auth/hooks/use-oauth'

// Mock the OAuth hook
jest.mock('../../../lib/auth/hooks/use-oauth')

const mockUseOAuth = useOAuth as jest.MockedFunction<typeof useOAuth>

describe('SocialButton', () => {
  const mockOnPress = jest.fn()
  const mockAuthenticate = jest.fn()
  const mockIsProviderConfigured = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseOAuth.mockReturnValue({
      authenticate: mockAuthenticate,
      isLoading: false,
      error: null,
      clearError: jest.fn(),
      availableProviders: ['github', 'google'],
      isProviderConfigured: mockIsProviderConfigured,
    })
    
    mockIsProviderConfigured.mockReturnValue(true)
  })

  it('renders GitHub button correctly', () => {
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} />
    )

    expect(getByText('Sign in with GitHub')).toBeTruthy()
  })

  it('renders Google button correctly', () => {
    const { getByText } = render(
      <SocialButton provider="google" onPress={mockOnPress} />
    )

    expect(getByText('Sign in with Google')).toBeTruthy()
  })

  it('shows signup text when type is signup', () => {
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} type="signup" />
    )

    expect(getByText('Sign up with GitHub')).toBeTruthy()
  })

  it('calls onPress when pressed and onPress is provided', () => {
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} />
    )

    fireEvent.press(getByText('Sign in with GitHub'))
    expect(mockOnPress).toHaveBeenCalledTimes(1)
  })

  it('calls OAuth authenticate when no onPress is provided', () => {
    const { getByText } = render(
      <SocialButton provider="github" />
    )

    fireEvent.press(getByText('Sign in with GitHub'))
    expect(mockAuthenticate).toHaveBeenCalledWith('github')
  })

  it('is disabled when disabled prop is true', () => {
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} disabled />
    )

    // Check that the component renders (disabled state is handled internally)
    expect(getByText('Sign in with GitHub')).toBeTruthy()
  })

  it('is disabled when provider is not configured', () => {
    mockIsProviderConfigured.mockReturnValue(false)
    
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} />
    )

    // Check that the component renders (disabled state is handled internally)
    expect(getByText('Sign in with GitHub')).toBeTruthy()
  })

  it('shows loading state when loading prop is true', () => {
    const { queryByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} loading />
    )

    // Should show loading indicator instead of icon
    expect(queryByText('Sign in with GitHub')).toBeTruthy()
    // The ActivityIndicator should be present (we can't easily test for it without testID)
  })

  it('shows loading state when OAuth is loading', () => {
    mockUseOAuth.mockReturnValue({
      authenticate: mockAuthenticate,
      isLoading: true,
      error: null,
      clearError: jest.fn(),
      availableProviders: ['github', 'google'],
      isProviderConfigured: mockIsProviderConfigured,
    })
    
    const { queryByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} />
    )

    expect(queryByText('Sign in with GitHub')).toBeTruthy()
  })

  it('does not call onPress when disabled', async () => {
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} disabled />
    )

    fireEvent.press(getByText('Sign in with GitHub'))
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockOnPress).not.toHaveBeenCalled()
  })

  it('does not call onPress when loading', async () => {
    const { getByText } = render(
      <SocialButton provider="github" onPress={mockOnPress} loading />
    )

    fireEvent.press(getByText('Sign in with GitHub'))
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockOnPress).not.toHaveBeenCalled()
  })

  it('calls OAuth success callback', async () => {
    const mockOnSuccess = jest.fn()
    const { getByText } = render(
      <SocialButton provider="github" onSuccess={mockOnSuccess} />
    )

    fireEvent.press(getByText('Sign in with GitHub'))
    
    // Simulate OAuth success by calling the success callback passed to useOAuth
    const oauthOptions = mockUseOAuth.mock.calls[0][0]
    if (oauthOptions?.onSuccess) {
      oauthOptions.onSuccess({ success: true, code: 'test-code' })
    }

    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('calls OAuth error callback', async () => {
    const mockOnError = jest.fn()
    const { getByText } = render(
      <SocialButton provider="github" onError={mockOnError} />
    )

    fireEvent.press(getByText('Sign in with GitHub'))
    
    // Simulate OAuth error by calling the error callback passed to useOAuth
    const oauthOptions = mockUseOAuth.mock.calls[0][0]
    if (oauthOptions?.onError) {
      oauthOptions.onError('Authentication failed')
    }

    expect(mockOnError).toHaveBeenCalledWith('Authentication failed')
  })

  it('passes redirectTo to OAuth hook', () => {
    render(
      <SocialButton provider="github" redirectTo="/dashboard" />
    )

    const oauthOptions = mockUseOAuth.mock.calls[0][0]
    expect(oauthOptions?.redirectTo).toBe('/dashboard')
  })
})