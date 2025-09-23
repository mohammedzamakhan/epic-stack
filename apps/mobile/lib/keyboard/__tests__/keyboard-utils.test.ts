import { getKeyboardConfig, dismissKeyboard } from '../keyboard-utils'
import { Keyboard } from 'react-native'

// Mock React Native Keyboard
jest.mock('react-native', () => ({
	Keyboard: {
		dismiss: jest.fn(),
		addListener: jest.fn(),
	},
}))

describe('keyboard-utils', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('getKeyboardConfig', () => {
		it('should return correct config for email input', () => {
			const config = getKeyboardConfig('email')

			expect(config).toEqual({
				keyboardType: 'email-address',
				autoCapitalize: 'none',
				autoCorrect: false,
				returnKeyType: 'next',
				textContentType: 'emailAddress',
				autoComplete: 'email',
			})
		})

		it('should return correct config for password input', () => {
			const config = getKeyboardConfig('password')

			expect(config).toEqual({
				keyboardType: 'default',
				autoCapitalize: 'none',
				autoCorrect: false,
				returnKeyType: 'done',
				textContentType: 'password',
				autoComplete: 'current-password',
			})
		})

		it('should return correct config for username input', () => {
			const config = getKeyboardConfig('username')

			expect(config).toEqual({
				keyboardType: 'default',
				autoCapitalize: 'none',
				autoCorrect: false,
				returnKeyType: 'next',
				textContentType: 'username',
				autoComplete: 'username',
			})
		})

		it('should return correct config for search input', () => {
			const config = getKeyboardConfig('search')

			expect(config).toEqual({
				keyboardType: 'default',
				autoCapitalize: 'none',
				autoCorrect: true,
				returnKeyType: 'search',
				textContentType: 'none',
			})
		})

		it('should return correct config for text input', () => {
			const config = getKeyboardConfig('text')

			expect(config).toEqual({
				keyboardType: 'default',
				autoCapitalize: 'sentences',
				autoCorrect: true,
				returnKeyType: 'done',
				textContentType: 'none',
			})
		})

		it('should return default config for unknown input type', () => {
			const config = getKeyboardConfig('unknown' as any)

			expect(config).toEqual({
				keyboardType: 'default',
				autoCapitalize: 'sentences',
				autoCorrect: true,
				returnKeyType: 'done',
				textContentType: 'none',
			})
		})
	})

	describe('dismissKeyboard', () => {
		it('should call Keyboard.dismiss', () => {
			dismissKeyboard()

			expect(Keyboard.dismiss).toHaveBeenCalledTimes(1)
		})
	})
})
