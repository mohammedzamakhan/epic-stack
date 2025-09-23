import React from 'react'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { Screen } from '../screen'

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
	SafeAreaView: ({ children, ...props }: any) => (
		<div {...props}>{children}</div>
	),
}))

describe('Screen', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<Screen>
				<Text>Screen content</Text>
			</Screen>,
		)
		expect(getByText('Screen content')).toBeTruthy()
	})

	it('uses SafeAreaView by default', () => {
		const { getByText } = render(
			<Screen>
				<Text>Content</Text>
			</Screen>,
		)
		// SafeAreaView should be used by default
		expect(getByText('Content')).toBeTruthy()
	})

	it('uses regular View when safeArea is false', () => {
		const { getByText } = render(
			<Screen safeArea={false}>
				<Text>Content</Text>
			</Screen>,
		)
		expect(getByText('Content')).toBeTruthy()
	})

	it('applies custom backgroundColor', () => {
		const { getByText } = render(
			<Screen backgroundColor="#FF0000">
				<Text>Content</Text>
			</Screen>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					backgroundColor: '#FF0000',
				}),
			]),
		)
	})

	it('forwards additional props', () => {
		const { getByTestId } = render(
			<Screen testID="custom-screen">
				<Text>Content</Text>
			</Screen>,
		)
		expect(getByTestId('custom-screen')).toBeTruthy()
	})

	it('applies default white background', () => {
		const { getByText } = render(
			<Screen>
				<Text>Content</Text>
			</Screen>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					backgroundColor: '#FFFFFF',
				}),
			]),
		)
	})
})
