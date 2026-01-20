import { Ionicons } from '@expo/vector-icons'
import React, { forwardRef } from 'react'
import {
	TextInput,
	type TextInputProps,
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	type StyleProp,
	type ViewStyle,
} from 'react-native'
import { getKeyboardConfig, type InputType } from '../../lib/keyboard'

export interface InputProps extends Omit<TextInputProps, 'style'> {
	label?: string
	error?: boolean | string
	disabled?: boolean
	rightIcon?: React.ReactNode | string
	onRightIconPress?: () => void
	rightIconAccessibilityLabel?: string
	style?: StyleProp<ViewStyle>
	inputType?: InputType
	onSubmitEditing?: () => void
	nextInputRef?: React.RefObject<TextInput | null>
}

const Input = forwardRef<TextInput, InputProps>(
	(
		{
			label,
			error,
			disabled,
			rightIcon,
			onRightIconPress,
			rightIconAccessibilityLabel,
			style,
			inputType = 'text',
			onSubmitEditing,
			nextInputRef,
			...props
		},
		ref,
	) => {
		const hasError = Boolean(error)
		const keyboardConfig = getKeyboardConfig(inputType)

		const handleSubmitEditing = () => {
			if (onSubmitEditing) {
				onSubmitEditing()
			} else if (nextInputRef?.current) {
				nextInputRef.current.focus()
			}
		}

		return (
			<View style={[styles.container, style]}>
				{label && <Text style={styles.label}>{label}</Text>}
				<View style={styles.inputContainer}>
					<TextInput
						ref={ref}
						style={[
							styles.input,
							hasError && styles.inputError,
							disabled && styles.inputDisabled,
							rightIcon ? styles.inputWithIcon : null,
						]}
						placeholderTextColor="#9CA3AF"
						editable={!disabled}
						// Apply keyboard optimizations
						keyboardType={keyboardConfig.keyboardType}
						autoCapitalize={keyboardConfig.autoCapitalize}
						autoCorrect={keyboardConfig.autoCorrect}
						returnKeyType={keyboardConfig.returnKeyType}
						textContentType={
							keyboardConfig.textContentType as TextInputProps['textContentType']
						}
						autoComplete={
							keyboardConfig.autoComplete as TextInputProps['autoComplete']
						}
						onSubmitEditing={handleSubmitEditing}
						accessibilityLabel={label || props.placeholder}
						// Merge with any overrides from props
						{...props}
					/>
					{rightIcon && (
						<TouchableOpacity
							style={styles.rightIconContainer}
							onPress={onRightIconPress}
							disabled={!onRightIconPress}
							accessibilityLabel={rightIconAccessibilityLabel || 'Input action'}
							accessibilityRole="button"
						>
							{typeof rightIcon === 'string' ? (
								<Ionicons
									name={rightIcon as keyof typeof Ionicons.glyphMap}
									size={20}
									color="#6B7280"
								/>
							) : (
								rightIcon
							)}
						</TouchableOpacity>
					)}
				</View>
				{typeof error === 'string' && error && (
					<Text style={styles.errorText}>{error}</Text>
				)}
			</View>
		)
	},
)

Input.displayName = 'Input'

const styles = StyleSheet.create({
	container: {
		// Remove default marginBottom to let parent control spacing
	},
	label: {
		fontSize: 14,
		fontWeight: '500',
		color: '#374151',
		marginBottom: 6,
	},
	inputContainer: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
	},
	input: {
		flex: 1,
		height: 44,
		borderWidth: 1,
		borderColor: '#D1D5DB',
		borderRadius: 8,
		paddingHorizontal: 12,
		fontSize: 16,
		backgroundColor: '#FFFFFF',
		color: '#111827',
	},
	inputWithIcon: {
		paddingRight: 44,
	},
	inputError: {
		borderColor: '#EF4444',
		borderWidth: 1.5,
	},
	inputDisabled: {
		backgroundColor: '#F3F4F6',
		color: '#9CA3AF',
	},
	rightIconContainer: {
		position: 'absolute',
		right: 12,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		fontSize: 12,
		color: '#EF4444',
		marginTop: 4,
	},
})

export { Input }
