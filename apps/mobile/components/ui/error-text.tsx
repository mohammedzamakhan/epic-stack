import React from 'react'
import { Text, StyleSheet, TextProps, View } from 'react-native'

export interface ErrorTextProps extends TextProps {
	children: React.ReactNode
	size?: 'sm' | 'default'
	variant?: 'inline' | 'block'
	icon?: boolean
}

const ErrorText: React.FC<ErrorTextProps> = ({
	children,
	size = 'default',
	variant = 'block',
	icon = false,
	style,
	...props
}) => {
	if (!children) return null

	const content = (
		<>
			{icon && <Text style={styles.icon}>⚠️ </Text>}
			<Text
				style={[
					styles.errorText,
					size === 'sm' && styles.errorTextSm,
					variant === 'inline' && styles.inlineText,
					style,
				]}
				{...props}
			>
				{children}
			</Text>
		</>
	)

	if (variant === 'inline') {
		return <View style={styles.inlineContainer}>{content}</View>
	}

	return <View style={styles.blockContainer}>{content}</View>
}

const styles = StyleSheet.create({
	blockContainer: {
		marginTop: 4,
	},
	inlineContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
	},
	errorText: {
		color: '#EF4444',
		fontSize: 14,
		flex: 1,
	},
	errorTextSm: {
		fontSize: 12,
	},
	inlineText: {
		marginTop: 0,
		flex: 0,
	},
	icon: {
		fontSize: 12,
		marginRight: 4,
	},
})

export { ErrorText }
