import { cn } from '../utils/cn'

interface PrioritySignalProps {
	priority: 'low' | 'medium' | 'high'
	className?: string
	theme?: 'light' | 'dark'
}

export function PrioritySignal({ 
	priority, 
	className, 
	theme = 'light' 
}: PrioritySignalProps) {
	const fill =
		theme === 'dark' ? 'lch(65.87% 0 0)' : 'lch(39.286% 1 282.863 / 1)'
	
	const getColorAndOpacity = (barIndex: number) => {
		switch (priority) {
			case 'low':
				return {
					opacity: barIndex === 0 ? '1' : '0.4',
				}
			case 'medium':
				return {
					opacity: barIndex <= 1 ? '1' : '0.4',
				}
			case 'high':
				return {
					opacity: '1',
				}
		}
	}

	const lowBar = getColorAndOpacity(0)
	const mediumBar = getColorAndOpacity(1)
	const highBar = getColorAndOpacity(2)

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
			{/* Low bar */}
			<rect
				x="1.5"
				y="8"
				width="2"
				height="6"
				rx="1"
				fill={fill}
				fillOpacity={lowBar.opacity}
			/>
			{/* Medium bar */}
			<rect
				x="6.5"
				y="5"
				width="2"
				height="9"
				rx="1"
				fill={fill}
				fillOpacity={mediumBar.opacity}
			/>
			{/* High bar */}
			<rect
				x="11.5"
				y="2"
				width="2"
				height="12"
				rx="1"
				fill={fill}
				fillOpacity={highBar.opacity}
			/>
		</svg>
	)
}
