import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Checkbox } from '../checkbox'

describe('Checkbox', () => {
  it('renders correctly when unchecked', () => {
    const { UNSAFE_getByType } = render(
      <Checkbox checked={false} onCheckedChange={() => {}} />
    )
    expect(UNSAFE_getByType('TouchableOpacity')).toBeTruthy()
  })

  it('renders correctly when checked', () => {
    const { getByText } = render(
      <Checkbox checked={true} onCheckedChange={() => {}} />
    )
    expect(getByText('✓')).toBeTruthy()
  })

  it('renders with label', () => {
    const { getByText } = render(
      <Checkbox 
        checked={false} 
        onCheckedChange={() => {}} 
        label="Remember me" 
      />
    )
    expect(getByText('Remember me')).toBeTruthy()
  })

  it('calls onCheckedChange when pressed', async () => {
    const mockOnCheckedChange = jest.fn()
    const { UNSAFE_getByType } = render(
      <Checkbox checked={false} onCheckedChange={mockOnCheckedChange} />
    )
    
    fireEvent.press(UNSAFE_getByType('TouchableOpacity'))
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockOnCheckedChange).toHaveBeenCalledWith(true)
  })

  it('calls onCheckedChange with opposite value', async () => {
    const mockOnCheckedChange = jest.fn()
    const { UNSAFE_getByType } = render(
      <Checkbox checked={true} onCheckedChange={mockOnCheckedChange} />
    )
    
    fireEvent.press(UNSAFE_getByType('TouchableOpacity'))
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0))
    
    expect(mockOnCheckedChange).toHaveBeenCalledWith(false)
  })

  it('does not call onCheckedChange when disabled', () => {
    const mockOnCheckedChange = jest.fn()
    const { UNSAFE_getByType } = render(
      <Checkbox 
        checked={false} 
        onCheckedChange={mockOnCheckedChange} 
        disabled 
      />
    )
    
    fireEvent.press(UNSAFE_getByType('TouchableOpacity'))
    expect(mockOnCheckedChange).not.toHaveBeenCalled()
  })

  it('applies disabled styling when disabled', () => {
    const { UNSAFE_getByType } = render(
      <Checkbox 
        checked={false} 
        onCheckedChange={() => {}} 
        disabled 
      />
    )
    
    const button = UNSAFE_getByType('TouchableOpacity')
    expect(button.props.disabled).toBe(true)
  })

  it('shows checkmark when checked', () => {
    const { getByText, rerender } = render(
      <Checkbox checked={false} onCheckedChange={() => {}} />
    )
    
    expect(() => getByText('✓')).toThrow()
    
    rerender(
      <Checkbox checked={true} onCheckedChange={() => {}} />
    )
    
    expect(getByText('✓')).toBeTruthy()
  })

  it('applies correct checked styling', () => {
    const { getByText } = render(
      <Checkbox checked={true} onCheckedChange={() => {}} />
    )
    
    // The checkmark should be visible and white
    const checkmark = getByText('✓')
    expect(checkmark.props.style).toEqual(
      expect.objectContaining({
        color: '#FFFFFF',
      })
    )
  })
})