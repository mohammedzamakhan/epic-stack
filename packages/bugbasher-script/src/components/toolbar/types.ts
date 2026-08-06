import type { ComponentChildren } from 'preact'
import type { JSX } from 'preact/jsx-runtime'

export interface ToolbarContextValue {
	isRecording: boolean
	isCommenting: boolean
	position: { x: number; y: number }
	isDragging: boolean
	onStartRecording: () => void
	onStopRecording: () => void
	onStartCommenting: () => void
	onStopCommenting: () => void
	setPosition: (position: { x: number; y: number }) => void
	setIsDragging: (isDragging: boolean) => void
}

export interface ToolbarRootProps extends JSX.HTMLAttributes<HTMLDivElement> {
	children: ComponentChildren
	defaultPosition?: { x: number; y: number }
	onPositionChange?: (position: { x: number; y: number }) => void
}

export interface ToolbarButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
	variant?: 'default' | 'icon' | 'recording' | 'commenting'
	isActive?: boolean
	icon?: ComponentChildren
}

export interface ToolbarDragHandleProps extends JSX.HTMLAttributes<HTMLDivElement> {}

export interface ToolbarGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
	children: ComponentChildren
}
