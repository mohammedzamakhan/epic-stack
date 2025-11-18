import { useAnimation } from 'motion/react'
import { useCallback, useImperativeHandle, useRef } from 'react'

export interface IconAnimationHandle {
	startAnimation: () => void
	stopAnimation: () => void
}

interface UseIconAnimationProps {
	onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void
	onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void
}

/**
 * Shared hook for animated icon components.
 * Provides animation controls and mouse event handlers.
 */
export function useIconAnimation(
	ref: React.ForwardedRef<IconAnimationHandle>,
	{ onMouseEnter, onMouseLeave }: UseIconAnimationProps = {},
) {
	const controls = useAnimation()
	const isControlledRef = useRef(false)

	useImperativeHandle(ref, () => {
		isControlledRef.current = true
		return {
			startAnimation: () => void controls.start('animate'),
			stopAnimation: () => void controls.start('normal'),
		}
	})

	const handleMouseEnter = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!isControlledRef.current) {
				void controls.start('animate')
			} else {
				onMouseEnter?.(e)
			}
		},
		[controls, onMouseEnter],
	)

	const handleMouseLeave = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!isControlledRef.current) {
				void controls.start('normal')
			} else {
				onMouseLeave?.(e)
			}
		},
		[controls, onMouseLeave],
	)

	return {
		controls,
		handleMouseEnter,
		handleMouseLeave,
	}
}
