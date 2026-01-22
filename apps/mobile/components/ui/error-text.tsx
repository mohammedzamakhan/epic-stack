import React from 'react'
import { Text, type TextProps, View } from 'react-native'

export interface ErrorTextProps extends TextProps {
	children: React.ReactNode
	size?: 'sm' | 'default'
	variant?: 'inline' | 'block'
	icon?: boolean
	className?: string
}

const ErrorText: React.FC<ErrorTextProps> = ({
	children,
	size = 'default',
	variant = 'block',
	icon = false,
	className,
	...props
}) => {
	if (!children) return null

	const content = (
		<>
			{icon && <Text className="mr-1 text-xs">⚠️ </Text>}
			<Text
				className={`text-destructive ${size === 'sm' ? 'text-xs' : 'text-sm'} ${
					variant === 'inline' ? '' : 'flex-1'
				} ${className ?? ''}`}
				{...props}
			>
				{children}
			</Text>
		</>
	)

	if (variant === 'inline') {
		return <View className="flex-row flex-wrap items-center">{content}</View>
	}

	return <View className="mt-1">{content}</View>
}

export { ErrorText }
