import React from 'react'
import { render } from '@testing-library/react-native'
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

	it('applies default padding', () => {
		const { getByText } = render(
			<Card>
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					padding: 16,
				}),
			]),
		)
	})

	it('applies custom padding', () => {
		const { getByText } = render(
			<Card padding={24}>
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					padding: 24,
				}),
			]),
		)
	})

	it('applies custom margin', () => {
		const { getByText } = render(
			<Card margin={12}>
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					margin: 12,
				}),
			]),
		)
	})

	it('applies custom elevation', () => {
		const { getByText } = render(
			<Card elevation={4}>
				<Text>Content</Text>
			</Card>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					elevation: 4,
				}),
			]),
		)
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

	it('applies flex: 1 style', () => {
		const { getByText } = render(
			<CardContent>
				<Text>Content</Text>
			</CardContent>,
		)

		const container = getByText('Content').parent
		expect(container?.props.style).toEqual(
			expect.objectContaining({
				flex: 1,
			}),
		)
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
