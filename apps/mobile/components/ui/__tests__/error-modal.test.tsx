import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ErrorModal } from '../error-modal'

describe('ErrorModal', () => {
  const mockOnDismiss = jest.fn()
  const mockPrimaryAction = jest.fn()
  const mockSecondaryAction = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when visible', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('Error Title')).toBeTruthy()
    expect(getByText('Error message')).toBeTruthy()
  })

  it('does not render modal when not visible', () => {
    const { queryByText } = render(
      <ErrorModal
        visible={false}
        title="Error Title"
        message="Error message"
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(queryByText('Error Title')).toBeNull()
    expect(queryByText('Error message')).toBeNull()
  })

  it('shows default OK button when no actions provided', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('OK')).toBeTruthy()
  })

  it('calls onDismiss when OK button is pressed', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        onDismiss={mockOnDismiss}
      />
    )
    
    fireEvent.press(getByText('OK'))
    expect(mockOnDismiss).toHaveBeenCalled()
  })

  it('shows primary action button when provided', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        primaryAction={{
          text: 'Confirm',
          onPress: mockPrimaryAction,
        }}
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('Confirm')).toBeTruthy()
  })

  it('calls primary action when button is pressed', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        primaryAction={{
          text: 'Confirm',
          onPress: mockPrimaryAction,
        }}
        onDismiss={mockOnDismiss}
      />
    )
    
    fireEvent.press(getByText('Confirm'))
    expect(mockPrimaryAction).toHaveBeenCalled()
  })

  it('shows secondary action button when provided', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        secondaryAction={{
          text: 'Cancel',
          onPress: mockSecondaryAction,
        }}
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('Cancel')).toBeTruthy()
  })

  it('calls secondary action when button is pressed', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        secondaryAction={{
          text: 'Cancel',
          onPress: mockSecondaryAction,
        }}
        onDismiss={mockOnDismiss}
      />
    )
    
    fireEvent.press(getByText('Cancel'))
    expect(mockSecondaryAction).toHaveBeenCalled()
  })

  it('shows both primary and secondary actions when provided', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        primaryAction={{
          text: 'Confirm',
          onPress: mockPrimaryAction,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: mockSecondaryAction,
        }}
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('Confirm')).toBeTruthy()
    expect(getByText('Cancel')).toBeTruthy()
  })

  it('displays correct icon for error type', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        type="error"
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('❌')).toBeTruthy()
  })

  it('displays correct icon for warning type', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Warning Title"
        message="Warning message"
        type="warning"
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('⚠️')).toBeTruthy()
  })

  it('displays correct icon for info type', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Info Title"
        message="Info message"
        type="info"
        onDismiss={mockOnDismiss}
      />
    )
    
    expect(getByText('ℹ️')).toBeTruthy()
  })

  it('does not call onDismiss on backdrop press when not dismissible', () => {
    const { getByText } = render(
      <ErrorModal
        visible={true}
        title="Error Title"
        message="Error message"
        dismissible={false}
        onDismiss={mockOnDismiss}
      />
    )
    
    // Try to press the backdrop (the modal container)
    const modal = getByText('Error Title').parent?.parent?.parent?.parent
    if (modal) {
      fireEvent.press(modal)
    }
    
    expect(mockOnDismiss).not.toHaveBeenCalled()
  })
})