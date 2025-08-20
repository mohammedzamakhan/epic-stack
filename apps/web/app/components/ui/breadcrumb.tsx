// Re-export breadcrumb components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	Breadcrumb as BaseBreadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
	BreadcrumbProvider,
} from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to Breadcrumb context
function Breadcrumb({ children, ...props }: React.ComponentProps<typeof BaseBreadcrumb> & { children?: React.ReactNode }) {
	return (
		<BreadcrumbProvider IconComponent={IconAdapter}>
			<BaseBreadcrumb {...props}>
				{children}
			</BaseBreadcrumb>
		</BreadcrumbProvider>
	)
}

export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
}
