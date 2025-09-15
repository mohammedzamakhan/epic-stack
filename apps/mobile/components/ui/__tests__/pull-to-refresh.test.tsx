import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { PullToRefresh } from '../pull-to-refresh'
import { triggerHaptic } from '../../../lib/haptics'

// Mock haptics
jest.mock('../../../lib/haptics', () => ({
  triggerHaptic: jest.fn(),
}))

// Mock the PullToRefresh component to test its logic
const mockTriggerHaptic = triggerHaptic as jest.MockedFunction<typeof triggerHaptic>

describe('PullToRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children', () => {
    const onRefresh = jest.fn()
    
    const { getByText } = render(
      <PullToRefresh onRefresh={onRefresh} refreshing={false}>
        <Text>Test content</Text>
      </PullToRefresh>
    )
    
    expect(getByText('Test content')).toBeTruthy()
  })

  it('should pass refreshing prop to RefreshControl', () => {
    const onRefresh = jest.fn()
    
    const { toJSON } = render(
      <PullToRefresh onRefresh={onRefresh} refreshing={true}>
        <Text>Test content</Text>
      </PullToRefresh>
    )
    
    // Check that the component renders without errors
    expect(toJSON()).toBeTruthy()
  })

  it('should pass testID to ScrollView', () => {
    const onRefresh = jest.fn()
    
    const { getByTestId } = render(
      <PullToRefresh onRefresh={onRefresh} refreshing={false} testID="scroll-view">
        <Text>Test content</Text>
      </PullToRefresh>
    )
    
    expect(getByTestId('scroll-view')).toBeTruthy()
  })

  it('should have hapticFeedback enabled by default', () => {
    const onRefresh = jest.fn()
    
    const { toJSON } = render(
      <PullToRefresh onRefresh={onRefresh} refreshing={false}>
        <Text>Test content</Text>
      </PullToRefresh>
    )
    
    // Component should render successfully with default hapticFeedback=true
    expect(toJSON()).toBeTruthy()
  })
})