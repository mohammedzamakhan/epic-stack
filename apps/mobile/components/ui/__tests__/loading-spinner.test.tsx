import React from 'react'
import { render } from '@testing-library/react-native'
import { LoadingSpinner } from '../loading-spinner'

describe('LoadingSpinner', () => {
	it('renders ActivityIndicator', () => {
		const { getByTestId } = render(<LoadingSpinner testID="spinner" />)
		expect(getByTestId('spinner')).toBeTruthy()
	})

	it('renders with text', () => {
		const { getByText } = render(<LoadingSpinner text="Loading..." />)
		expect(getByText('Loading...')).toBeTruthy()
	})

	it('does not render text when not provided', () => {
		const { queryByText } = render(<LoadingSpinner />)
		expect(queryByText('Loading...')).toBeNull()
	})

	it('applies overlay styling when overlay is true', () => {
		const { getByTestId } = render(<LoadingSpinner testID="spinner" overlay />)

		const container = getByTestId('spinner')
		expect(container.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					position: 'absolute',
					backgroundColor: 'rgba(255, 255, 255, 0.8)',
				}),
			]),
		)
	})

	it('does not apply overlay styling by default', () => {
		const { getByTestId } = render(<LoadingSpinner testID="spinner" />)

		const container = getByTestId('spinner')
		expect(container.props.style).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					position: 'absolute',
				}),
			]),
		)
	})

	it('forwards additional props', () => {
		const { getByTestId } = render(
			<LoadingSpinner testID="custom-spinner" accessibilityLabel="Loading" />,
		)

		const spinner = getByTestId('custom-spinner')
		expect(spinner.props.accessibilityLabel).toBe('Loading')
	})

	it('applies correct text styling', () => {
		const { getByText } = render(<LoadingSpinner text="Please wait..." />)

		const text = getByText('Please wait...')
		expect(text.props.style).toEqual(
			expect.objectContaining({
				fontSize: 14,
				color: '#6B7280',
				textAlign: 'center',
			}),
		)
	})
})
