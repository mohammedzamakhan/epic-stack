// Re-export command components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	Command as BaseCommand,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
	CommandProvider,
} from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to Command context
function Command({ children, ...props }: React.ComponentProps<typeof BaseCommand> & { children?: React.ReactNode }) {
	return (
		<CommandProvider IconComponent={IconAdapter}>
			<BaseCommand {...props}>
				{children}
			</BaseCommand>
		</CommandProvider>
	)
}

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
}
