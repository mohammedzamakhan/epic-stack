import React from 'react'
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	TouchableOpacityProps,
} from 'react-native'
import { triggerSelectionHaptic } from '../../lib/haptics'

export interface CheckboxProps extends TouchableOpacityProps {
	checked?: boolean
	onCheckedChange: (checked: boolean) => void
	label?: string
	disabled?: boolean
	error?: boolean
	hapticFeedback?: boolean
}

const Checkbox: React.FC<CheckboxProps> = ({
	checked = false,
	error = false,
	onCheckedChange,
	label,
	disabled = false,
	hapticFeedback = true,
	style,
	...props
}) => {
	const handlePress = async () => {
		if (!disabled) {
			if (hapticFeedback) {
				await triggerSelectionHaptic()
			}
			onCheckedChange(!checked)
		}
	}

	return (
		<TouchableOpacity
			style={[styles.container, disabled && styles.containerDisabled, style]}
			onPress={handlePress}
			disabled={disabled}
			activeOpacity={0.7}
			{...props}
		>
			<View
				style={[
					styles.checkbox,
					checked && styles.checkboxChecked,
					disabled && styles.checkboxDisabled,
					error && styles.checkboxError,
				]}
			>
				{checked && <Text style={styles.checkmark}>✓</Text>}
			</View>
			{label && (
				<Text
					style={[
						styles.label,
						disabled && styles.labelDisabled,
						error && styles.labelError,
					]}
				>
					{label}
				</Text>
			)}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 8,
	},
	containerDisabled: {
		opacity: 0.5,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderWidth: 2,
		borderColor: '#D1D5DB',
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	checkboxChecked: {
		backgroundColor: '#3B82F6',
		borderColor: '#3B82F6',
	},
	checkboxDisabled: {
		backgroundColor: '#F3F4F6',
		borderColor: '#E5E7EB',
	},
	checkboxError: {
		borderColor: '#EF4444',
	},
	checkmark: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: 'bold',
	},
	label: {
		marginLeft: 8,
		fontSize: 14,
		color: '#374151',
		flex: 1,
	},
	labelDisabled: {
		color: '#9CA3AF',
	},
	labelError: {
		color: '#EF4444',
	},
})

export { Checkbox }
