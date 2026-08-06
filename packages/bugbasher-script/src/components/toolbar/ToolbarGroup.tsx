import { toolbarGroupStyles } from './styles'
import { cn } from '../../utils/cn'
import type { ToolbarGroupProps } from './types'

export function ToolbarGroup({
	className,
	children,
	...props
}: ToolbarGroupProps) {
	return (
		<div
			className={cn(toolbarGroupStyles(), className)}
			data-slot="designer-toolbar-group"
			{...props}
		>
			{children}
		</div>
	)
}
