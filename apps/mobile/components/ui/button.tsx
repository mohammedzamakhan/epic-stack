import React from 'react'
import {
	Pressable,
	Text,
	ActivityIndicator,
	type PressableProps,
	type GestureResponderEvent,
} from 'react-native'
import { triggerButtonHaptic } from '../../lib/haptics'

export interface ButtonProps extends PressableProps {
	children: React.ReactNode
	variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
	size?: 'sm' | 'default' | 'lg'
	loading?: boolean
	disabled?: boolean
	hapticFeedback?: boolean
}

const variantClasses = {
	primary: 'bg-primary border border-primary',
	secondary: 'bg-secondary border border-border',
	outline: 'bg-transparent border border-border',
	ghost: 'bg-transparent',
	destructive: 'bg-destructive border border-destructive',
} as const

const textVariantClasses = {
	primary: 'text-primary-foreground',
	secondary: 'text-secondary-foreground',
	outline: 'text-primary',
	ghost: 'text-primary',
	destructive: 'text-primary-foreground',
} as const

const sizeClasses = {
	sm: 'h-9 px-3',
	default: 'h-11 px-4',
	lg: 'h-13 px-6',
} as const

const textSizeClasses = {
	sm: 'text-sm',
	default: 'text-base',
	lg: 'text-lg',
} as const

const Button: React.FC<ButtonProps> = ({
	children,
	variant = 'primary',
	size = 'default',
	loading = false,
	disabled = false,
	hapticFeedback = true,
	onPress,
	className,
	...props
}) => {
	const isDisabled = disabled || loading

	const handlePress = async (event: GestureResponderEvent) => {
		if (isDisabled) return

		if (hapticFeedback) {
			await triggerButtonHaptic()
		}
		onPress?.(event)
	}

	return (
		<Pressable
			className={`flex-row items-center justify-center rounded-lg ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
			onPress={handlePress}
			disabled={isDisabled}
			accessibilityState={{ disabled: isDisabled }}
			{...props}
		>
			{loading ? (
				<ActivityIndicator
					size="small"
					className={
						variant === 'primary' || variant === 'destructive'
							? 'text-primary-foreground'
							: 'text-primary'
					}
				/>
			) : (
				<Text
					className={`font-medium ${textVariantClasses[variant]} ${textSizeClasses[size]} ${isDisabled ? 'opacity-70' : ''}`}
				>
					{children}
				</Text>
			)}
		</Pressable>
	)
}

export { Button }
