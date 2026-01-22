import React from 'react'
import { View, type ViewProps } from 'react-native'

export interface CardProps extends ViewProps {
	children: React.ReactNode
	className?: string
}

const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
	return (
		<View
			className={`bg-card border-border rounded-xl border p-4 shadow-sm ${className ?? ''}`}
			{...props}
		>
			{children}
		</View>
	)
}

const CardHeader: React.FC<ViewProps & { className?: string }> = ({
	children,
	className,
	...props
}) => {
	return (
		<View className={`mb-4 ${className ?? ''}`} {...props}>
			{children}
		</View>
	)
}

const CardContent: React.FC<ViewProps & { className?: string }> = ({
	children,
	className,
	...props
}) => {
	return (
		<View className={`flex-1 ${className ?? ''}`} {...props}>
			{children}
		</View>
	)
}

const CardFooter: React.FC<ViewProps & { className?: string }> = ({
	children,
	className,
	...props
}) => {
	return (
		<View className={`mt-4 ${className ?? ''}`} {...props}>
			{children}
		</View>
	)
}

export { Card, CardHeader, CardContent, CardFooter }
