import React, { useEffect, useRef } from 'react'
import { Text, StyleSheet, Animated, TouchableOpacity } from 'react-native'

export interface ToastProps {
	message: string
	type?: 'error' | 'success' | 'warning' | 'info'
	visible: boolean
	duration?: number
	onHide: () => void
	position?: 'top' | 'bottom'
}

const Toast: React.FC<ToastProps> = ({
	message,
	type = 'error',
	visible,
	duration = 4000,
	onHide,
	position = 'top',
}) => {
	const fadeAnim = useRef(new Animated.Value(0)).current
	const slideAnim = useRef(
		new Animated.Value(position === 'top' ? -100 : 100),
	).current

	const hideToast = React.useCallback(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}),
			Animated.timing(slideAnim, {
				toValue: position === 'top' ? -100 : 100,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start(() => {
			onHide()
		})
	}, [fadeAnim, onHide, position, slideAnim])

	useEffect(() => {
		if (visible) {
			// Show animation
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 300,
					useNativeDriver: true,
				}),
				Animated.timing(slideAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}),
			]).start()

			// Auto hide after duration
			const timer = setTimeout(() => {
				hideToast()
			}, duration)

			return () => clearTimeout(timer)
		} else {
			hideToast()
		}
	}, [visible, duration, fadeAnim, slideAnim, hideToast])

	// Don't render if not visible and animation hasn't started
	if (!visible) {
		return null
	}

	const getToastStyle = () => {
		switch (type) {
			case 'success':
				return styles.successToast
			case 'warning':
				return styles.warningToast
			case 'info':
				return styles.infoToast
			case 'error':
			default:
				return styles.errorToast
		}
	}

	const getTextStyle = () => {
		switch (type) {
			case 'success':
				return styles.successText
			case 'warning':
				return styles.warningText
			case 'info':
				return styles.infoText
			case 'error':
			default:
				return styles.errorText
		}
	}

	return (
		<Animated.View
			style={[
				styles.container,
				position === 'top' ? styles.topPosition : styles.bottomPosition,
				{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				},
			]}
		>
			<TouchableOpacity
				style={[styles.toast, getToastStyle()]}
				onPress={hideToast}
				activeOpacity={0.9}
				accessibilityRole="button"
				accessibilityLabel="Dismiss notification"
			>
				<Text style={[styles.message, getTextStyle()]}>{message}</Text>
			</TouchableOpacity>
		</Animated.View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		zIndex: 9999,
	},
	topPosition: {
		top: 60,
	},
	bottomPosition: {
		bottom: 60,
	},
	toast: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	message: {
		fontSize: 14,
		fontWeight: '500',
		textAlign: 'center',
	},
	errorToast: {
		backgroundColor: '#FEF2F2',
		borderLeftWidth: 4,
		borderLeftColor: '#EF4444',
	},
	successToast: {
		backgroundColor: '#F0FDF4',
		borderLeftWidth: 4,
		borderLeftColor: '#22C55E',
	},
	warningToast: {
		backgroundColor: '#FFFBEB',
		borderLeftWidth: 4,
		borderLeftColor: '#F59E0B',
	},
	infoToast: {
		backgroundColor: '#EFF6FF',
		borderLeftWidth: 4,
		borderLeftColor: '#3B82F6',
	},
	errorText: {
		color: '#DC2626',
	},
	successText: {
		color: '#16A34A',
	},
	warningText: {
		color: '#D97706',
	},
	infoText: {
		color: '#2563EB',
	},
})

export { Toast }
