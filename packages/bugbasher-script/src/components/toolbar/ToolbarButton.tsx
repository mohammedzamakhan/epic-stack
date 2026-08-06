import type { ComponentChildren } from 'preact'
import { toolbarButtonStyles } from './styles'
import { cn } from '../../utils/cn'
import type { ToolbarButtonProps } from './types'

interface ButtonProps extends ToolbarButtonProps {
	children?: ComponentChildren
}

export function ToolbarButton({
	className,
	variant = 'default',
	isActive = false,
	icon,
	children,
	...props
}: ButtonProps) {
	const size = variant === 'icon' ? 'icon' : 'default'

	return (
		<button
			type="button"
			className={cn(toolbarButtonStyles({ variant }), className)}
			data-slot="designer-toolbar-button"
			data-size={size}
			data-state="closed"
			{...props}
		>
			{icon}
			{children}
		</button>
	)
}
