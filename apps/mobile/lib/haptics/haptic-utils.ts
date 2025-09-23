import * as Haptics from 'expo-haptics'
import type { HapticFeedbackType } from './types'

/**
 * Trigger haptic feedback with error handling
 */
export const triggerHaptic = async (
	type: HapticFeedbackType,
): Promise<void> => {
	try {
		switch (type) {
			case 'light':
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
				break
			case 'medium':
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
				break
			case 'heavy':
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
				break
			case 'success':
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success,
				)
				break
			case 'warning':
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Warning,
				)
				break
			case 'error':
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
				break
			case 'selection':
				await Haptics.selectionAsync()
				break
			default:
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
		}
	} catch (error) {
		// Haptic feedback is not critical, so we just log the error
		console.warn('Haptic feedback failed:', error)
	}
}

/**
 * Trigger haptic feedback for button interactions
 */
export const triggerButtonHaptic = async (): Promise<void> => {
	await triggerHaptic('light')
}

/**
 * Trigger haptic feedback for successful actions
 */
export const triggerSuccessHaptic = async (): Promise<void> => {
	await triggerHaptic('success')
}

/**
 * Trigger haptic feedback for errors
 */
export const triggerErrorHaptic = async (): Promise<void> => {
	await triggerHaptic('error')
}

/**
 * Trigger haptic feedback for selections/toggles
 */
export const triggerSelectionHaptic = async (): Promise<void> => {
	await triggerHaptic('selection')
}
