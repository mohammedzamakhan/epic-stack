// Re-export PrioritySignal from the UI package with theme integration
import { useTheme } from '#app/routes/resources+/theme-switch.tsx'
import { PrioritySignal as BasePrioritySignal } from '@repo/ui'

interface PrioritySignalProps {
	priority: 'low' | 'medium' | 'high'
	className?: string
}

export function PrioritySignal({ priority, className }: PrioritySignalProps) {
	const theme = useTheme()
	
	return (
		<BasePrioritySignal 
			priority={priority} 
			className={className} 
			theme={theme}
		/>
	)
}
