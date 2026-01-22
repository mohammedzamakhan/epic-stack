import React from 'react'
import {
	TouchableOpacity,
	View,
	Text,
	type TouchableOpacityProps,
} from 'react-native'
import { triggerSelectionHaptic } from '../../lib/haptics'

export interface CheckboxProps extends TouchableOpacityProps {
	checked?: boolean
	onCheckedChange: (checked: boolean) => void
	label?: string
	disabled?: boolean
	error?: boolean
	hapticFeedback?: boolean
	className?: string
}

const Checkbox: React.FC<CheckboxProps> = ({
	checked = false,
	error = false,
	onCheckedChange,
	label,
	disabled = false,
	hapticFeedback = true,
	className,
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
			className={`my-2 flex-row items-center ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
			onPress={handlePress}
			disabled={disabled}
			activeOpacity={0.7}
			accessibilityRole="checkbox"
			accessibilityState={{ checked }}
			{...props}
		>
			<View
				className={`h-5 w-5 items-center justify-center rounded border-2 ${
					checked
						? 'bg-primary border-primary'
						: disabled
							? 'bg-muted border-border'
							: 'bg-background border-input'
				} ${error ? 'border-destructive' : ''}`}
			>
				{checked && (
					<Text className="text-primary-foreground text-xs font-bold">✓</Text>
				)}
			</View>
			{label && (
				<Text
					className={`ml-2 flex-1 text-sm ${
						disabled
							? 'text-muted-foreground'
							: error
								? 'text-destructive'
								: 'text-foreground'
					}`}
				>
					{label}
				</Text>
			)}
		</TouchableOpacity>
	)
}

export { Checkbox }
