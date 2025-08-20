// Re-export select components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	Select as BaseSelect,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectProvider,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to Select context
function Select({ children, ...props }: React.ComponentProps<typeof BaseSelect> & { children?: React.ReactNode }) {
	return (
		<SelectProvider IconComponent={IconAdapter}>
			<BaseSelect {...props}>
				{children}
			</BaseSelect>
		</SelectProvider>
	)
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
}
