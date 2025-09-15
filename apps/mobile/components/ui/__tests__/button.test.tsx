import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { Button } from '../button'
import { triggerButtonHaptic } from '../../../lib/haptics'

// Mock haptics
jest.mock('../../../lib/haptics', () => ({
  triggerButtonHaptic: jest.fn(),
}))

describe('Button', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render button with text', () => {
    const { getByText } = render(
      <Button onPress={jest.fn()}>Test Button</Button>
    )
    
    expect(getByText('Test Button')).toBeTruthy()
  })

  it('should call onPress when pressed', async () => {
    const onPress = jest.fn()
    
    const { getByText } = render(
      <Button onPress={onPress}>Test Button</Button>
    )
    
    fireEvent.press(getByText('Test Button'))
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('should trigger haptic feedback by default', async () => {
    const onPress = jest.fn()
    
    const { getByText } = render(
      <Button onPress={onPress}>Test Button</Button>
    )
    
    fireEvent.press(getByText('Test Button'))
    
    await waitFor(() => {
      expect(triggerButtonHaptic).toHaveBeenCalledTimes(1)
    })
  })

  it('should not trigger haptic feedback when disabled', async () => {
    const onPress = jest.fn()
    
    const { getByText } = render(
      <Button onPress={onPress} hapticFeedback={false}>Test Button</Button>
    )
    
    fireEvent.press(getByText('Test Button'))
    
    expect(triggerButtonHaptic).not.toHaveBeenCalled()
  })

  it('should not trigger haptic feedback when button is disabled', async () => {
    const onPress = jest.fn()
    
    const { getByText } = render(
      <Button onPress={onPress} disabled={true}>Test Button</Button>
    )
    
    fireEvent.press(getByText('Test Button'))
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(triggerButtonHaptic).not.toHaveBeenCalled()
    expect(onPress).not.toHaveBeenCalled()
  })

  it('should not trigger haptic feedback when loading', async () => {
    const onPress = jest.fn()
    
    const { queryByText } = render(
      <Button onPress={onPress} loading={true}>Test Button</Button>
    )
    
    // Button text should not be visible when loading
    expect(queryByText('Test Button')).toBeNull()
    expect(triggerButtonHaptic).not.toHaveBeenCalled()
  })

  it('should show loading indicator when loading', () => {
    const { getByTestId } = render(
      <Button onPress={jest.fn()} loading={true} testID="button">
        Test Button
      </Button>
    )
    
    // ActivityIndicator should be present
    const button = getByTestId('button')
    expect(button).toBeTruthy()
  })
})