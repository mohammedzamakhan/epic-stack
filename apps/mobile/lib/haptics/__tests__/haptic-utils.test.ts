import * as Haptics from 'expo-haptics'
import {
	triggerHaptic,
	triggerButtonHaptic,
	triggerSuccessHaptic,
	triggerErrorHaptic,
	triggerSelectionHaptic,
} from '../haptic-utils'

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
	impactAsync: jest.fn(),
	notificationAsync: jest.fn(),
	selectionAsync: jest.fn(),
	ImpactFeedbackStyle: {
		Light: 'light',
		Medium: 'medium',
		Heavy: 'heavy',
	},
	NotificationFeedbackType: {
		Success: 'success',
		Warning: 'warning',
		Error: 'error',
	},
}))

describe('haptic-utils', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe('triggerHaptic', () => {
		it('should trigger light impact haptic', async () => {
			await triggerHaptic('light')

			expect(Haptics.impactAsync).toHaveBeenCalledWith('light')
		})

		it('should trigger medium impact haptic', async () => {
			await triggerHaptic('medium')

			expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')
		})

		it('should trigger heavy impact haptic', async () => {
			await triggerHaptic('heavy')

			expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy')
		})

		it('should trigger success notification haptic', async () => {
			await triggerHaptic('success')

			expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
		})

		it('should trigger warning notification haptic', async () => {
			await triggerHaptic('warning')

			expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning')
		})

		it('should trigger error notification haptic', async () => {
			await triggerHaptic('error')

			expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')
		})

		it('should trigger selection haptic', async () => {
			await triggerHaptic('selection')

			expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1)
		})

		it('should handle haptic errors gracefully', async () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
			;(Haptics.impactAsync as jest.Mock).mockRejectedValue(
				new Error('Haptic failed'),
			)

			await triggerHaptic('light')

			expect(consoleSpy).toHaveBeenCalledWith(
				'Haptic feedback failed:',
				expect.any(Error),
			)
			consoleSpy.mockRestore()
		})
	})

	describe('convenience functions', () => {
		it('should trigger button haptic', async () => {
			await triggerButtonHaptic()

			expect(Haptics.impactAsync).toHaveBeenCalledWith('light')
		})

		it('should trigger success haptic', async () => {
			await triggerSuccessHaptic()

			expect(Haptics.notificationAsync).toHaveBeenCalledWith('success')
		})

		it('should trigger error haptic', async () => {
			await triggerErrorHaptic()

			expect(Haptics.notificationAsync).toHaveBeenCalledWith('error')
		})

		it('should trigger selection haptic', async () => {
			await triggerSelectionHaptic()

			expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1)
		})
	})
})
