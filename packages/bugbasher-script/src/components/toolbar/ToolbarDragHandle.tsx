import { toolbarDragHandleStyles } from './styles'
import { cn } from '../../utils/cn'
import type { ToolbarDragHandleProps } from './types'

export function ToolbarDragHandle({
	className,
	...props
}: ToolbarDragHandleProps) {
	return (
		<div
			className={cn(toolbarDragHandleStyles(), className)}
			aria-hidden="true"
			{...props}
		/>
	)
}
