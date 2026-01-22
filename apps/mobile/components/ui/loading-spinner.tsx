import React from 'react'
import { View, ActivityIndicator, Text, type ViewProps } from 'react-native'

interface LoadingSpinnerProps extends Omit<ViewProps, 'style'> {
	size?: 'small' | 'large'
	text?: string
	overlay?: boolean
	className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
	size = 'large',
	text,
	overlay = false,
	className,
	...props
}) => {
	return (
		<View
			className={`items-center justify-center p-5 ${
				overlay ? 'absolute top-0 right-0 bottom-0 left-0 z-50 bg-white/80' : ''
			} ${className ?? ''}`}
			{...props}
		>
			<ActivityIndicator size={size} className="text-primary" />
			{text && (
				<Text className="text-muted-foreground mt-3 text-center text-sm">
					{text}
				</Text>
			)}
		</View>
	)
}

export { LoadingSpinner }
export type { LoadingSpinnerProps }
