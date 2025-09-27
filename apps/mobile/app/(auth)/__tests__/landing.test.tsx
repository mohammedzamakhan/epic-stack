import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import LandingScreen from '../landing'

// Mock expo-router
jest.mock('expo-router', () => ({
	useRouter: jest.fn(),
}))

const mockPush = jest.fn()

describe('LandingScreen', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		;(useRouter as jest.Mock).mockReturnValue({
			push: mockPush,
		})
	})

	it('renders correctly', () => {
		const { getByText } = render(<LandingScreen />)

		expect(getByText('Epic Stack')).toBeTruthy()
		expect(getByText('Mobile')).toBeTruthy()
		expect(getByText(/Ship your ideas/)).toBeTruthy()
		expect(getByText('Get Started')).toBeTruthy()
		expect(getByText('Sign In')).toBeTruthy()
	})

	it('navigates to sign-up when Get Started is pressed', () => {
		const { getByText } = render(<LandingScreen />)

		fireEvent.press(getByText('Get Started'))

		expect(mockPush).toHaveBeenCalledWith('/(auth)/sign-up')
	})

	it('navigates to sign-in when Sign In is pressed', () => {
		const { getByText } = render(<LandingScreen />)

		fireEvent.press(getByText('Sign In'))

		expect(mockPush).toHaveBeenCalledWith('/(auth)/sign-in')
	})

	it('displays feature items', () => {
		const { getByText } = render(<LandingScreen />)

		expect(getByText('Lightning Fast')).toBeTruthy()
		expect(getByText('Secure by Default')).toBeTruthy()
		expect(getByText('Beautiful UI')).toBeTruthy()
	})
})