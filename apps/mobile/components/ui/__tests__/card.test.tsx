import { render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { Card, CardHeader, CardContent, CardFooter } from '../card'

describe('Card', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<Card>
				<Text>Card content</Text>
			</Card>,
		)
		expect(getByText('Card content')).toBeTruthy()
	})

	it('applies default className with padding', () => {
		const { getByText } = render(
			<Card>
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.className).toContain('p-4')
	})

	it('applies custom className', () => {
		const { getByText } = render(
			<Card className="p-6">
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.className).toContain('p-6')
	})

	it('applies card background and border classes', () => {
		const { getByText } = render(
			<Card>
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.className).toContain('bg-card')
		expect(container?.props.className).toContain('border')
	})

	it('forwards additional props', () => {
		const { getByTestId } = render(
			<Card testID="custom-card">
				<Text>Content</Text>
			</Card>,
		)
		expect(getByTestId('custom-card')).toBeTruthy()
	})
})

describe('CardHeader', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<CardHeader>
				<Text>Header content</Text>
			</CardHeader>,
		)
		expect(getByText('Header content')).toBeTruthy()
	})

	it('forwards props correctly', () => {
		const { getByTestId } = render(
			<CardHeader testID="card-header">
				<Text>Header</Text>
			</CardHeader>,
		)
		expect(getByTestId('card-header')).toBeTruthy()
	})
})

describe('CardContent', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<CardContent>
				<Text>Content text</Text>
			</CardContent>,
		)
		expect(getByText('Content text')).toBeTruthy()
	})

	it('applies flex-1 class', () => {
		const { getByText } = render(
			<CardContent>
				<Text>Content</Text>
			</CardContent>,
		)

		const container = getByText('Content').parent
		expect(container?.props.className).toContain('flex-1')
	})
})

describe('CardFooter', () => {
	it('renders children correctly', () => {
		const { getByText } = render(
			<CardFooter>
				<Text>Footer content</Text>
			</CardFooter>,
		)
		expect(getByText('Footer content')).toBeTruthy()
	})

	it('forwards props correctly', () => {
		const { getByTestId } = render(
			<CardFooter testID="card-footer">
				<Text>Footer</Text>
			</CardFooter>,
		)
		expect(getByTestId('card-footer')).toBeTruthy()
	})
})
