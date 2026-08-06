import { useState, useCallback } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ToolbarContext } from './context'
import { toolbarRootStyles } from './styles'
import { cn } from '../../utils/cn'

const STORAGE_KEY = 'bugbasher_toolbar_position'

interface ToolbarRootInternalProps {
	children: ComponentChildren
	className?: string
	defaultPosition?: { x: number; y: number }
	onPositionChange?: (position: { x: number; y: number }) => void
	isRecording?: boolean
	isCommenting?: boolean
	onStartRecording: () => void
	onStopRecording: () => void
	onStartCommenting: () => void
	onStopCommenting: () => void
}

export function ToolbarRoot({
	children,
	className,
	defaultPosition = { x: 20, y: 20 },
	onPositionChange,
	isRecording = false,
	isCommenting = false,
	onStartRecording,
	onStopRecording,
	onStartCommenting,
	onStopCommenting,
	...props
}: ToolbarRootInternalProps) {
	const [position, setPositionState] = useState(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) {
				return JSON.parse(saved)
			}
		} catch {
			// Ignore errors
		}
		return defaultPosition
	})

	const [isDragging, setIsDragging] = useState(false)

	const setPosition = useCallback(
		(newPosition: { x: number; y: number }) => {
			setPositionState(newPosition)
			onPositionChange?.(newPosition)

			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosition))
			} catch {
				// Ignore errors
			}
		},
		[onPositionChange],
	)

	const contextValue = {
		isRecording,
		isCommenting,
		position,
		isDragging,
		onStartRecording,
		onStopRecording,
		onStartCommenting,
		onStopCommenting,
		setPosition,
		setIsDragging,
	}

	return (
		<ToolbarContext.Provider value={contextValue}>
			<div
				className={cn(toolbarRootStyles(), className)}
				style={{ top: 0, left: 0 }}
				{...props}
			>
				{children}
			</div>
		</ToolbarContext.Provider>
	)
}
