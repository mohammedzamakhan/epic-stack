import { useId } from 'react'
import { cn } from '../utils/cn'

interface PrioritySignalProps {
	priority: 'low' | 'medium' | 'high'
	className?: string
	theme?: 'light' | 'dark'
}

export function PrioritySignal({
	priority,
	className,
	theme = 'light',
}: PrioritySignalProps) {
	const patternId = useId()
	const fill =
		theme === 'dark' ? 'lch(65.87% 0 0)' : 'lch(39.286% 1 282.863 / 1)'

	const getBarStyle = (barIndex: number) => {
		const isActive =
			priority === 'high' ||
			(priority === 'medium' && barIndex <= 1) ||
			(priority === 'low' && barIndex === 0)

		return {
			opacity: isActive ? '1' : '0.4',
			pattern: isActive ? 'solid' : 'dashed',
		}
	}

	const lowBar = getBarStyle(0)
	const mediumBar = getBarStyle(1)
	const highBar = getBarStyle(2)

	return (
		<svg
			aria-label={`${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`}
			className={cn('', className)}
			width="16"
			height="16"
			viewBox="0 0 16 16"
			role="img"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<pattern
					id={patternId}
					patternUnits="userSpaceOnUse"
					width="2"
					height="2"
				>
					<circle cx="1" cy="1" r="0.5" fill={fill} fillOpacity="0.4" />
				</pattern>
			</defs>
			{/* Low bar */}
			<rect
				x="1.5"
				y="8"
				width="2"
				height="6"
				rx="1"
				fill={lowBar.pattern === 'solid' ? fill : `url(#${patternId})`}
				fillOpacity={lowBar.pattern === 'solid' ? lowBar.opacity : undefined}
			/>
			{/* Medium bar */}
			<rect
				x="6.5"
				y="5"
				width="2"
				height="9"
				rx="1"
				fill={mediumBar.pattern === 'solid' ? fill : `url(#${patternId})`}
				fillOpacity={
					mediumBar.pattern === 'solid' ? mediumBar.opacity : undefined
				}
			/>
			{/* High bar */}
			<rect
				x="11.5"
				y="2"
				width="2"
				height="12"
				rx="1"
				fill={highBar.pattern === 'solid' ? fill : `url(#${patternId})`}
				fillOpacity={highBar.pattern === 'solid' ? highBar.opacity : undefined}
			/>
		</svg>
	)
}
