// Re-export sheet components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	Sheet as BaseSheet,
	SheetTrigger,
	SheetClose,
	SheetContent as BaseSheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
	SheetProvider,
} from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to Sheet context
function Sheet({ children, ...props }: React.ComponentProps<typeof BaseSheet> & { children?: React.ReactNode }) {
	return (
		<SheetProvider IconComponent={IconAdapter}>
			<BaseSheet {...props}>
				{children}
			</BaseSheet>
		</SheetProvider>
	)
}

// Enhanced SheetContent that automatically gets Icon from context
function SheetContent(props: React.ComponentProps<typeof BaseSheetContent>) {
	return <BaseSheetContent {...props} />
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
}
