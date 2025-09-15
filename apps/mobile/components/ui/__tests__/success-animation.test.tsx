import React from 'react'
import { render } from '@testing-library/react-native'
import { SuccessAnimation } from '../success-animation'

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native')
  
  RN.Animated.timing = () => ({
    start: jest.fn((callback) => callback && callback()),
  })
  RN.Animated.sequence = () => ({
    start: jest.fn((callback) => callback && callback()),
  })
  RN.Animated.parallel = () => ({
    start: jest.fn((callback) => callback && callback()),
  })
  RN.Animated.delay = () => ({
    start: jest.fn((callback) => callback && callback()),
  })
  
  return RN
})

describe('SuccessAnimation', () => {
  it('should not render when not visible', () => {
    const { queryByText } = render(
      <SuccessAnimation visible={false} message="Success!" />
    )
    
    expect(queryByText('Success!')).toBeNull()
  })

  it('should render when visible', () => {
    const { getByText } = render(
      <SuccessAnimation visible={true} message="Success!" />
    )
    
    expect(getByText('Success!')).toBeTruthy()
    expect(getByText('✓')).toBeTruthy()
  })

  it('should render default message when no message provided', () => {
    const { getByText } = render(
      <SuccessAnimation visible={true} />
    )
    
    expect(getByText('Success!')).toBeTruthy()
  })

  it('should render custom message', () => {
    const { getByText } = render(
      <SuccessAnimation visible={true} message="Custom success message" />
    )
    
    expect(getByText('Custom success message')).toBeTruthy()
  })

  it('should call onComplete when animation finishes', () => {
    const onComplete = jest.fn()
    
    render(
      <SuccessAnimation 
        visible={true} 
        message="Success!" 
        onComplete={onComplete}
      />
    )
    
    // Animation should complete immediately in tests
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})