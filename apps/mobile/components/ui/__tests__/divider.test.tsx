import React from 'react'
import { render } from '@testing-library/react-native'
import { Divider } from '../divider'

describe('Divider', () => {
  it('renders simple divider without text', () => {
    const { getByTestId } = render(
      <Divider testID="simple-divider" />
    )
    expect(getByTestId('simple-divider')).toBeTruthy()
  })

  it('renders divider with text', () => {
    const { getByText } = render(
      <Divider text="OR" />
    )
    expect(getByText('OR')).toBeTruthy()
  })

  it('applies default color to simple divider', () => {
    const { getByTestId } = render(
      <Divider testID="divider" />
    )
    
    const divider = getByTestId('divider')
    expect(divider.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#E5E7EB',
        })
      ])
    )
  })

  it('applies custom color to simple divider', () => {
    const { getByTestId } = render(
      <Divider testID="divider" color="#FF0000" />
    )
    
    const divider = getByTestId('divider')
    expect(divider.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#FF0000',
        })
      ])
    )
  })

  it('applies custom thickness', () => {
    const { getByTestId } = render(
      <Divider testID="divider" thickness={3} />
    )
    
    const divider = getByTestId('divider')
    expect(divider.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: 3,
        })
      ])
    )
  })

  it('applies custom text color', () => {
    const { getByText } = render(
      <Divider text="Custom" textColor="#0000FF" />
    )
    
    const text = getByText('Custom')
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#0000FF',
        })
      ])
    )
  })

  it('forwards additional props', () => {
    const { getByTestId } = render(
      <Divider testID="custom-divider" accessibilityLabel="Divider" />
    )
    
    const divider = getByTestId('custom-divider')
    expect(divider.props.accessibilityLabel).toBe('Divider')
  })

  it('renders with default text color when text is provided', () => {
    const { getByText } = render(
      <Divider text="Default Color" />
    )
    
    const text = getByText('Default Color')
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: '#6B7280',
        })
      ])
    )
  })
})