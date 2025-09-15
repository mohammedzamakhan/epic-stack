import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ErrorBanner } from '../error-banner'

describe('ErrorBanner', () => {
  const mockOnDismiss = jest.fn()
  const mockOnAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders banner message correctly', () => {
    const { getByText } = render(
      <ErrorBanner message="Test error message" />
    )
    expect(getByText('Test error message')).toBeTruthy()
  })

  it('applies correct styling for error type', () => {
    const { getByText } = render(
      <ErrorBanner message="Error message" type="error" />
    )
    
    const message = getByText('Error message')
    expect(message.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#DC2626',
        })
      ])
    )
  })

  it('applies correct styling for warning type', () => {
    const { getByText } = render(
      <ErrorBanner message="Warning message" type="warning" />
    )
    
    const message = getByText('Warning message')
    expect(message.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#D97706',
        })
      ])
    )
  })

  it('applies correct styling for info type', () => {
    const { getByText } = render(
      <ErrorBanner message="Info message" type="info" />
    )
    
    const message = getByText('Info message')
    expect(message.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#2563EB',
        })
      ])
    )
  })

  it('shows dismiss button when dismissible is true', () => {
    const { getByText } = render(
      <ErrorBanner
        message="Test message"
        dismissible={true}
        onDismiss={mockOnDismiss}
      />
    )
    expect(getByText('×')).toBeTruthy()
  })

  it('does not show dismiss button when dismissible is false', () => {
    const { queryByText } = render(
      <ErrorBanner
        message="Test message"
        dismissible={false}
        onDismiss={mockOnDismiss}
      />
    )
    expect(queryByText('×')).toBeNull()
  })

  it('calls onDismiss when dismiss button is pressed', () => {
    const { getByText } = render(
      <ErrorBanner
        message="Test message"
        dismissible={true}
        onDismiss={mockOnDismiss}
      />
    )
    
    fireEvent.press(getByText('×'))
    expect(mockOnDismiss).toHaveBeenCalled()
  })

  it('shows action button when actionText and onAction are provided', () => {
    const { getByText } = render(
      <ErrorBanner
        message="Test message"
        actionText="Retry"
        onAction={mockOnAction}
      />
    )
    expect(getByText('Retry')).toBeTruthy()
  })

  it('calls onAction when action button is pressed', () => {
    const { getByText } = render(
      <ErrorBanner
        message="Test message"
        actionText="Retry"
        onAction={mockOnAction}
      />
    )
    
    fireEvent.press(getByText('Retry'))
    expect(mockOnAction).toHaveBeenCalled()
  })

  it('shows both action and dismiss buttons when both are provided', () => {
    const { getByText } = render(
      <ErrorBanner
        message="Test message"
        actionText="Retry"
        onAction={mockOnAction}
        dismissible={true}
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('Retry')).toBeTruthy()
    expect(getByText('×')).toBeTruthy()
  })

  it('forwards additional props', () => {
    const { getByTestId } = render(
      <ErrorBanner
        message="Test message"
        testID="custom-banner"
        accessibilityLabel="Error banner"
      />
    )
    
    const banner = getByTestId('custom-banner')
    expect(banner.props.accessibilityLabel).toBe('Error banner')
  })
})