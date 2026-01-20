import React from 'react'
import {
	View,
	Text,
	StyleSheet,
	Modal,
	TouchableOpacity,
	TouchableWithoutFeedback,
	Dimensions,
} from 'react-native'

export interface ErrorModalProps {
	visible: boolean
	title: string
	message: string
	type?: 'error' | 'warning' | 'info'
	primaryAction?: {
		text: string
		onPress: () => void
	}
	secondaryAction?: {
		text: string
		onPress: () => void
	}
	onDismiss?: () => void
	dismissible?: boolean
}

const ErrorModal: React.FC<ErrorModalProps> = ({
	visible,
	title,
	message,
	type = 'error',
	primaryAction,
	secondaryAction,
	onDismiss,
	dismissible = true,
}) => {
	const handleBackdropPress = () => {
		if (dismissible && onDismiss) {
			onDismiss()
		}
	}

	const getIconStyle = () => {
		switch (type) {
			case 'warning':
				return styles.warningIcon
			case 'info':
				return styles.infoIcon
			case 'error':
			default:
				return styles.errorIcon
		}
	}

	const getIcon = () => {
		switch (type) {
			case 'warning':
				return '⚠️'
			case 'info':
				return 'ℹ️'
			case 'error':
			default:
				return '❌'
		}
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={dismissible ? onDismiss : undefined}
		>
			<TouchableWithoutFeedback onPress={handleBackdropPress}>
				<View style={styles.backdrop}>
					<TouchableWithoutFeedback>
						<View style={styles.modal}>
							<View style={styles.header}>
								<View style={[styles.iconContainer, getIconStyle()]}>
									<Text style={styles.icon}>{getIcon()}</Text>
								</View>
								<Text style={styles.title}>{title}</Text>
							</View>

							<Text style={styles.message}>{message}</Text>

							<View style={styles.actions}>
								{secondaryAction && (
									<TouchableOpacity
										style={[styles.button, styles.secondaryButton]}
										onPress={secondaryAction.onPress}
										accessibilityRole="button"
									>
										<Text style={styles.secondaryButtonText}>
											{secondaryAction.text}
										</Text>
									</TouchableOpacity>
								)}

								{primaryAction && (
									<TouchableOpacity
										style={[styles.button, styles.primaryButton]}
										onPress={primaryAction.onPress}
										accessibilityRole="button"
									>
										<Text style={styles.primaryButtonText}>
											{primaryAction.text}
										</Text>
									</TouchableOpacity>
								)}

								{!primaryAction && !secondaryAction && dismissible && (
									<TouchableOpacity
										style={[styles.button, styles.primaryButton]}
										onPress={onDismiss}
										accessibilityRole="button"
									>
										<Text style={styles.primaryButtonText}>OK</Text>
									</TouchableOpacity>
								)}
							</View>
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
	backdrop: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modal: {
		backgroundColor: '#FFFFFF',
		borderRadius: 12,
		padding: 24,
		width: Math.min(width - 40, 400),
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 4,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 8,
	},
	header: {
		alignItems: 'center',
		marginBottom: 16,
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 12,
	},
	icon: {
		fontSize: 24,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		color: '#111827',
		textAlign: 'center',
	},
	message: {
		fontSize: 14,
		color: '#6B7280',
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 24,
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		gap: 12,
	},
	button: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 6,
		minWidth: 80,
		alignItems: 'center',
	},
	primaryButton: {
		backgroundColor: '#EF4444',
	},
	secondaryButton: {
		backgroundColor: '#F3F4F6',
		borderWidth: 1,
		borderColor: '#D1D5DB',
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '600',
	},
	secondaryButtonText: {
		color: '#374151',
		fontSize: 14,
		fontWeight: '600',
	},
	errorIcon: {
		backgroundColor: '#FEE2E2',
	},
	warningIcon: {
		backgroundColor: '#FEF3C7',
	},
	infoIcon: {
		backgroundColor: '#DBEAFE',
	},
})

export { ErrorModal }
