import React, { useState, useRef, useEffect } from 'react'
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native'

interface InputOTPProps {
	maxLength: number
	value: string
	onChange: (value: string) => void
	disabled?: boolean
	style?: ViewStyle
	children?: React.ReactNode
}

interface InputOTPGroupProps {
	children: React.ReactNode
}

interface InputOTPSlotProps {
	index: number
}

// Context to share state between InputOTP and its slots
const InputOTPContext = React.createContext<{
	value: string
	onChange: (value: string) => void
	maxLength: number
	disabled?: boolean
	focusedIndex: number
	setFocusedIndex: (index: number) => void
} | null>(null)

export function InputOTP({
	maxLength,
	value,
	onChange,
	disabled,
	style,
	children,
}: InputOTPProps) {
	const [focusedIndex, setFocusedIndex] = useState(0)

	// Reset focus to first slot when value is cleared
	useEffect(() => {
		if (value.length === 0) {
			setFocusedIndex(0)
		}
	}, [value.length])

	const contextValue = {
		value,
		onChange,
		maxLength,
		disabled,
		focusedIndex,
		setFocusedIndex,
	}

	return (
		<InputOTPContext.Provider value={contextValue}>
			<View style={[styles.container, style]}>{children}</View>
		</InputOTPContext.Provider>
	)
}

export function InputOTPGroup({ children }: InputOTPGroupProps) {
	return <View style={styles.group}>{children}</View>
}

export function InputOTPSlot({ index }: InputOTPSlotProps) {
	const context = React.useContext(InputOTPContext)
	const inputRef = useRef<TextInput>(null)

	if (!context) {
		throw new Error('InputOTPSlot must be used within InputOTP')
	}

	const {
		value,
		onChange,
		maxLength,
		disabled,
		focusedIndex,
		setFocusedIndex,
	} = context
	const currentValue = value[index] || ''
	const isFocused = focusedIndex === index

	useEffect(() => {
		// Auto-focus the current focused index
		if (isFocused && inputRef.current) {
			// Small delay to ensure the component is ready
			setTimeout(() => {
				inputRef.current?.focus()
			}, 50)
		}
	}, [isFocused])

	useEffect(() => {
		// Focus the first slot initially if no value
		if (index === 0 && value.length === 0) {
			setFocusedIndex(0)
		}
	}, [index, value.length, setFocusedIndex])

	const handleChangeText = (text: string) => {
		console.log(`InputOTP Slot ${index}: handleChangeText called with:`, text)

		// Handle pasted content or multiple characters
		if (text.length > 1) {
			console.log(
				`InputOTP Slot ${index}: Handling paste with ${text.length} characters`,
			)
			// If multiple digits are pasted, distribute them across slots
			const digits = text.replace(/\D/g, '').slice(0, maxLength)
			console.log(`InputOTP Slot ${index}: Extracted digits:`, digits)
			onChange(digits)

			// Focus the next empty slot or the last slot
			const nextIndex = Math.min(digits.length, maxLength - 1)
			setFocusedIndex(nextIndex)
			return
		}

		// Handle single character input
		const digit = text.replace(/\D/g, '') // Only allow digits
		console.log(`InputOTP Slot ${index}: Single digit input:`, digit)

		// Build new value array
		const newValueArray = Array(maxLength).fill('')
		for (let i = 0; i < value.length; i++) {
			newValueArray[i] = value[i] || ''
		}

		// Set the digit at current index
		newValueArray[index] = digit

		// Create final value string
		const finalValue = newValueArray.join('')
		console.log(`InputOTP Slot ${index}: Final value:`, finalValue)
		onChange(finalValue)

		// Move to next input if digit was entered and not at the end
		if (digit && index < maxLength - 1) {
			console.log(`InputOTP Slot ${index}: Moving focus to slot ${index + 1}`)
			setFocusedIndex(index + 1)
		}
	}

	const handleKeyPress = ({ nativeEvent }: any) => {
		// Handle backspace
		if (nativeEvent.key === 'Backspace') {
			if (currentValue) {
				// Clear current slot
				const newValueArray = Array(maxLength).fill('')
				for (let i = 0; i < value.length; i++) {
					newValueArray[i] = value[i] || ''
				}
				newValueArray[index] = ''

				const finalValue = newValueArray.join('').replace(/undefined/g, '')
				onChange(finalValue)
			} else if (index > 0) {
				// Move to previous slot and clear it
				setFocusedIndex(index - 1)

				const newValueArray = Array(maxLength).fill('')
				for (let i = 0; i < value.length; i++) {
					newValueArray[i] = value[i] || ''
				}
				newValueArray[index - 1] = ''

				const finalValue = newValueArray.join('').replace(/undefined/g, '')
				onChange(finalValue)
			}
		}
	}

	const handleFocus = () => {
		setFocusedIndex(index)
	}

	const handlePress = () => {
		setFocusedIndex(index)
		inputRef.current?.focus()
	}

	return (
		<TextInput
			ref={inputRef}
			style={[
				styles.slot,
				isFocused && styles.slotFocused,
				disabled && styles.slotDisabled,
			]}
			value={currentValue}
			onChangeText={handleChangeText}
			onKeyPress={handleKeyPress}
			onFocus={handleFocus}
			onPressIn={handlePress}
			maxLength={1}
			keyboardType="numeric"
			textAlign="center"
			editable={!disabled}
			selectTextOnFocus={true}
			autoFocus={index === 0}
			blurOnSubmit={false}
		/>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
	},
	group: {
		flexDirection: 'row',
		gap: 8,
	},
	slot: {
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
	slotFocused: {
		borderColor: '#3b82f6',
		backgroundColor: '#f8fafc',
	},
	slotDisabled: {
		backgroundColor: '#f3f4f6',
		color: '#9ca3af',
	},
})
