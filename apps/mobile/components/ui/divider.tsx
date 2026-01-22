import React from 'react'
import { View, Text, type ViewProps } from 'react-native'

interface DividerProps extends Omit<ViewProps, 'style'> {
	text?: string
	color?: string
	thickness?: number
	textColor?: string
	className?: string
}

const Divider: React.FC<DividerProps> = ({
	text,
	color,
	thickness = 1,
	textColor,
	className,
	...props
}) => {
	const lineStyle = color
		? { backgroundColor: color, height: thickness }
		: { height: thickness }
	const textStyle = textColor ? { color: textColor } : undefined

	if (text) {
		return (
			<View
				className={`my-4 flex-row items-center ${className ?? ''}`}
				{...props}
			>
				<View className="bg-border flex-1" style={lineStyle} />
				<Text
					className="text-muted-foreground px-4 text-sm font-medium"
					style={textStyle}
				>
					{text}
				</Text>
				<View className="bg-border flex-1" style={lineStyle} />
			</View>
		)
	}

	return (
		<View
			className={`bg-border my-2 ${className ?? ''}`}
			style={lineStyle}
			{...props}
		/>
	)
}

export { Divider }
export type { DividerProps }
