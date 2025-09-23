import React from 'react'
import { render } from '@testing-library/react-native'
import { LoadingOverlay } from '../loading-overlay'

describe('LoadingOverlay', () => {
	it('should not render when not visible', () => {
		const { queryByText } = render(
			<LoadingOverlay visible={false} message="Loading..." />,
		)

		expect(queryByText('Loading...')).toBeNull()
	})

	it('should render when visible', () => {
		const { getByText } = render(
			<LoadingOverlay visible={true} message="Loading..." />,
		)

		expect(getByText('Loading...')).toBeTruthy()
	})

	it('should render default message when no message provided', () => {
		const { getByText } = render(<LoadingOverlay visible={true} />)

		expect(getByText('Loading...')).toBeTruthy()
	})

	it('should render custom message', () => {
		const { getByText } = render(
			<LoadingOverlay visible={true} message="Custom loading message" />,
		)

		expect(getByText('Custom loading message')).toBeTruthy()
	})
})
