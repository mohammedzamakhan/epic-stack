// Re-export status-button components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import { StatusButton as BaseStatusButton } from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to StatusButton
export const StatusButton = (props: React.ComponentProps<typeof BaseStatusButton>) => {
	return <BaseStatusButton {...props} IconComponent={IconAdapter} />
}
