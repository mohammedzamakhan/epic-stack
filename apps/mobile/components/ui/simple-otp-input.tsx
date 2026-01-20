import React, { useState, useRef, useEffect } from 'react'
import {
	View,
	TextInput,
	StyleSheet,
	type NativeSyntheticEvent,
	type TextInputKeyPressEventData,
} from 'react-native'

interface SimpleOTPInputProps {
	length: number
	value: string
	onChange: (value: string) => void
	disabled?: boolean
}

export function SimpleOTPInput({
	length,
	value,
	onChange,
	disabled,
}: SimpleOTPInputProps) {
	const [focusedIndex, setFocusedIndex] = useState(0)
	const inputRefs = useRef<(TextInput | null)[]>([])

	// Initialize refs array
	useEffect(() => {
		inputRefs.current = inputRefs.current.slice(0, length)
	}, [length])

	const handleChangeText = (text: string, index: number) => {
		// Only allow alphanumeric characters
		const char = text
			.replace(/[^A-Za-z0-9]/g, '')
			.slice(-1)
			.toUpperCase()

		// Create new value array
		const newValue = Array(length).fill('')

		// Fill with existing values
		for (let i = 0; i < Math.min(value.length, length); i++) {
			newValue[i] = value[i] || ''
		}

		// Set new character
		newValue[index] = char

		// Join and update
		const finalValue = newValue.join('')
		onChange(finalValue)

		// Move to next input if character entered
		if (char && index < length - 1) {
			inputRefs.current[index + 1]?.focus()
			setFocusedIndex(index + 1)
		}
	}

	const handleKeyPress = (
		event: NativeSyntheticEvent<TextInputKeyPressEventData>,
		index: number,
	) => {
		if (event.nativeEvent.key === 'Backspace') {
			const currentValue = value[index] || ''

			if (!currentValue && index > 0) {
				// Move to previous input and clear it
				inputRefs.current[index - 1]?.focus()
				setFocusedIndex(index - 1)

				// Clear previous digit
				const newValue = Array(length).fill('')
				for (let i = 0; i < Math.min(value.length, length); i++) {
					newValue[i] = value[i] || ''
				}
				newValue[index - 1] = ''

				const finalValue = newValue.join('')
				onChange(finalValue)
			}
		}
	}

	const handleFocus = (index: number) => {
		setFocusedIndex(index)
	}

	return (
		<View style={styles.container}>
			{Array.from({ length }, (_, index) => (
				<TextInput
					key={index}
					ref={(ref) => {
						inputRefs.current[index] = ref
					}}
					style={[
						styles.input,
						focusedIndex === index && styles.inputFocused,
						disabled && styles.inputDisabled,
					]}
					value={value[index] || ''}
					onChangeText={(text) => handleChangeText(text, index)}
					onKeyPress={(event) => handleKeyPress(event, index)}
					onFocus={() => handleFocus(index)}
					maxLength={1}
					keyboardType="default"
					textAlign="center"
					editable={!disabled}
					autoFocus={index === 0}
					selectTextOnFocus
					accessibilityLabel={`Digit ${index + 1} of ${length}`}
				/>
			))}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		gap: 8,
		justifyContent: 'center',
	},
	input: {
		width: 48,
		height: 48,
		borderWidth: 2,
		borderColor: '#e5e7eb',
		borderRadius: 8,
		fontSize: 18,
		fontWeight: '600',
		color: '#1f2937',
		backgroundColor: '#ffffff',
	},
	inputFocused: {
		borderColor: '#3b82f6',
		backgroundColor: '#f8fafc',
	},
	inputDisabled: {
		backgroundColor: '#f3f4f6',
		color: '#9ca3af',
	},
})
