import React from 'react'
import { View, Text, StyleSheet, ViewProps } from 'react-native'

interface DividerProps extends Omit<ViewProps, 'style'> {
	text?: string
	color?: string
	thickness?: number
	textColor?: string
}

const Divider: React.FC<DividerProps> = ({
	text,
	color = '#E5E7EB',
	thickness = 1,
	textColor = '#6B7280',
	...props
}) => {
	if (text) {
		return (
			<View style={styles.container} {...props}>
				<View
					style={[styles.line, { backgroundColor: color, height: thickness }]}
				/>
				<Text style={[styles.text, { color: textColor }]}>{text}</Text>
				<View
					style={[styles.line, { backgroundColor: color, height: thickness }]}
				/>
			</View>
		)
	}

	return (
		<View
			style={[
				styles.simpleDivider,
				{ backgroundColor: color, height: thickness },
			]}
			{...props}
		/>
	)
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 16,
	},
	line: {
		flex: 1,
	},
	text: {
		paddingHorizontal: 16,
		fontSize: 14,
		fontWeight: '500',
	},
	simpleDivider: {
		marginVertical: 8,
	},
})

export { Divider }
export type { DividerProps }
