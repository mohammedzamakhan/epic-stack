// Re-export dropdown-menu components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	DropdownMenu as BaseDropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
	DropdownMenuProvider,
} from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to DropdownMenu context
function DropdownMenu({ children, ...props }: React.ComponentProps<typeof BaseDropdownMenu> & { children?: React.ReactNode }) {
	return (
		<DropdownMenuProvider IconComponent={IconAdapter}>
			<BaseDropdownMenu {...props}>
				{children}
			</BaseDropdownMenu>
		</DropdownMenuProvider>
	)
}

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
}
