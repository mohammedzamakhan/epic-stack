'use client'

import { motion, useAnimation } from 'motion/react'
import {
	type HTMLAttributes,
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
} from 'react'
import { cn } from '#app/utils/misc.tsx'

export interface ListTodoIconHandle {
	startAnimation: () => void
	stopAnimation: () => void
}

interface ListTodoIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const ListTodoIcon = forwardRef<ListTodoIconHandle, ListTodoIconProps>(
	({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
				}
				onMouseEnter?.(e)
			},
			[controls, onMouseEnter],
		)

		const handleMouseLeave = useCallback(
			(e: React.MouseEvent<HTMLDivElement>) => {
				if (!isControlledRef.current) {
					void controls.start('normal')
				}
				onMouseLeave?.(e)
			},
			[controls, onMouseLeave],
		)

		return (
			<div
				className={cn(className)}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				{...props}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width={size}
					height={size}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<motion.g
						variants={{
							normal: { scale: 1, opacity: 1 },
							animate: { scale: 0.8, opacity: 0.2 },
						}}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						initial="normal"
						animate={controls}
					>
						<rect x="3" y="5" width="6" height="6" rx="1" />
					</motion.g>
					<motion.g
						variants={{
							normal: { scale: 0, opacity: 0 },
							animate: { scale: 1, opacity: 1 },
						}}
						transition={{ duration: 0.3, ease: 'easeInOut', delay: 0.1 }}
						initial="normal"
						animate={controls}
						style={{ transformOrigin: '6px 8px' }}
					>
						<path d="m3 8 2 2 4-4" />
					</motion.g>
					<motion.g
						variants={{
							normal: { scale: 0, opacity: 0 },
							animate: { scale: 1, opacity: 1 },
						}}
						transition={{ duration: 0.3, ease: 'easeInOut', delay: 0.1 }}
						initial="normal"
						animate={controls}
						style={{ transformOrigin: '6px 8px' }}
					>
						<path d="m3 8 2 2 4-4" />
					</motion.g>
					<motion.g
						variants={{
							normal: { scale: 0, opacity: 0 },
							animate: { scale: 1, opacity: 1 },
						}}
						transition={{ duration: 0.2, ease: 'easeInOut', delay: 0.2 }}
						initial="normal"
						animate={controls}
						style={{ transformOrigin: '6px 8px' }}
					>
						<path d="m3 17 2 2 4-4" />
					</motion.g>
					<motion.g
						variants={{
							normal: { scale: 1, opacity: 1 },
							animate: { scale: 0, opacity: 0 },
						}}
						transition={{ duration: 0.1, delay: 0, ease: 'linear' }}
						initial="normal"
						animate={controls}
						style={{ transformOrigin: '6px 8px' }}
					>
						<path d="m3 17 2 2 4-4" />
					</motion.g>
					<path d="M13 6h8" />
					<path d="M13 12h8" />
					<path d="M13 18h8" />
				</svg>
			</div>
		)
	},
)

ListTodoIcon.displayName = 'ListTodoIcon'

export { ListTodoIcon }
