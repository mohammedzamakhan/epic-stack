import { cn } from '../../utils/cn'

interface ToolbarSeparatorProps {
	className?: string
}

export function ToolbarSeparator({ className }: ToolbarSeparatorProps) {
	return (
		<div
			className={cn('bg-border h-4 w-px', className)}
			data-slot="designer-toolbar-separator"
		/>
	)
}
