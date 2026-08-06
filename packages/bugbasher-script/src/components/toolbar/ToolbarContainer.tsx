import { useRef, useCallback, useEffect } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import type { JSX } from 'preact/jsx-runtime'
import { useToolbarContext } from './context'
import { toolbarContainerStyles } from './styles'
import { cn } from '../../utils/cn'

interface ToolbarContainerProps {
	children: ComponentChildren
	className?: string
}

export function ToolbarContainer({
	children,
	className,
}: ToolbarContainerProps) {
	const { position, isDragging, setPosition, setIsDragging } =
		useToolbarContext()

	const containerRef = useRef<HTMLDivElement>(null)
	const dragOffsetRef = useRef({ x: 0, y: 0 })

	const handleMouseDown = useCallback(
		(e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
			// Only allow dragging if clicking on the container itself, not buttons
			if (e.target === e.currentTarget && containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect()
				dragOffsetRef.current = {
					x: e.clientX - rect.left,
					y: e.clientY - rect.top,
				}
				setIsDragging(true)
				e.preventDefault()
			}
		},
		[setIsDragging],
	)

	useEffect(() => {
		if (!isDragging) return

		const handleMouseMove = (e: globalThis.MouseEvent) => {
			if (!containerRef.current) return

			const newX = e.clientX - dragOffsetRef.current.x
			const newY = e.clientY - dragOffsetRef.current.y

			const maxX = window.innerWidth - containerRef.current.offsetWidth
			const maxY = window.innerHeight - containerRef.current.offsetHeight

			setPosition({
				x: Math.max(0, Math.min(newX, maxX)),
				y: Math.max(0, Math.min(newY, maxY)),
			})
		}

		const handleMouseUp = () => {
			setIsDragging(false)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)

		return () => {
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isDragging, setPosition, setIsDragging])

	return (
		<div
			ref={containerRef}
			className={cn(toolbarContainerStyles({ isDragging }), className)}
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
			}}
			onMouseDown={handleMouseDown}
			data-slot="designer-toolbar"
		>
			{children}
		</div>
	)
}
