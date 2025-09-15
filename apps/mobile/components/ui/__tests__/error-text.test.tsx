import React from 'react'
import { render } from '@testing-library/react-native'
import { ErrorText } from '../error-text'

describe('ErrorText', () => {
  it('renders error message correctly', () => {
    const { getByText } = render(
      <ErrorText>This is an error message</ErrorText>
    )
    expect(getByText('This is an error message')).toBeTruthy()
  })

  it('does not render when children is null', () => {
    const { queryByTestId } = render(
      <ErrorText testID="error-text">{null}</ErrorText>
    )
    expect(queryByTestId('error-text')).toBeNull()
  })

  it('does not render when children is undefined', () => {
    const { queryByTestId } = render(
      <ErrorText testID="error-text">{undefined}</ErrorText>
    )
    expect(queryByTestId('error-text')).toBeNull()
  })

  it('does not render when children is empty string', () => {
    const { queryByTestId } = render(
      <ErrorText testID="error-text">{''}</ErrorText>
    )
    expect(queryByTestId('error-text')).toBeNull()
  })

  it('applies correct default styling', () => {
    const { getByText } = render(
      <ErrorText>Error message</ErrorText>
    )
    
    const errorText = getByText('Error message')
    expect(errorText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#EF4444',
          fontSize: 14,
        })
      ])
    )
  })

  it('applies small size styling', () => {
    const { getByText } = render(
      <ErrorText size="sm">Small error</ErrorText>
    )
    
    const errorText = getByText('Small error')
    expect(errorText.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontSize: 12,
        })
      ])
    )
  })

  it('renders with multiple children', () => {
    const { getByText } = render(
      <ErrorText>
        Error: <ErrorText>Nested error</ErrorText>
      </ErrorText>
    )
    expect(getByText('Nested error')).toBeTruthy()
  })

  it('forwards additional props', () => {
    const { getByTestId } = render(
      <ErrorText testID="custom-error" accessibilityLabel="Error message">
        Error text
      </ErrorText>
    )
    
    const errorText = getByTestId('custom-error')
    expect(errorText.props.accessibilityLabel).toBe('Error message')
  })

  it('renders with inline variant', () => {
    const { getByText } = render(
      <ErrorText variant="inline">Inline error</ErrorText>
    )
    expect(getByText('Inline error')).toBeTruthy()
  })

  it('renders with block variant by default', () => {
    const { getByText } = render(
      <ErrorText>Block error</ErrorText>
    )
    expect(getByText('Block error')).toBeTruthy()
  })

  it('renders with icon when specified', () => {
    const { getByText } = render(
      <ErrorText icon={true}>Error with icon</ErrorText>
    )
    expect(getByText('⚠️ ')).toBeTruthy()
    expect(getByText('Error with icon')).toBeTruthy()
  })

  it('does not render icon by default', () => {
    const { queryByText } = render(
      <ErrorText>Error without icon</ErrorText>
    )
    expect(queryByText('⚠️ ')).toBeNull()
  })
})