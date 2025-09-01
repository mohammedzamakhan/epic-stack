'use client'

import { type Variants, motion, useAnimation } from 'motion/react'
import {
	type HTMLAttributes,
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
} from 'react'
import { cn } from '#app/utils/misc.tsx'

export interface McpIconHandle {
	startAnimation: () => void
	stopAnimation: () => void
}

interface McpIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const pathVariants: Variants = {
	normal: {
		pathLength: 1,
		opacity: 1,
	},
	animate: {
		pathLength: [0, 1],
		opacity: [0, 1],
	},
}

const McpIcon = forwardRef<McpIconHandle, McpIconProps>(
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
					viewBox="0 0 180 180"
					fill="none"
				>
					<g clipPath="url(#clip0_19_13)">
						{/* M path - animated first */}
						<path
							d="M18 84.8528L85.8822 16.9706C95.2548 7.59798 110.451 7.59798 119.823 16.9706V16.9706C129.196 26.3431 129.196 41.5391 119.823 50.9117L68.5581 102.177"
							stroke="currentColor"
							strokeWidth="12"
							strokeLinecap="round"
						/>
						{/* P path - animated second */}
						<path
							d="M69.2652 101.47L119.823 50.9117C129.196 41.5391 144.392 41.5391 153.765 50.9117L154.118 51.2652C163.491 60.6378 163.491 75.8338 154.118 85.2063L92.7248 146.6C89.6006 149.724 89.6006 154.789 92.7248 157.913L105.331 170.52"
							stroke="currentColor"
							strokeWidth="12"
							strokeLinecap="round"
						/>
						{/* C path - animated third */}
						<motion.path
							d="M102.853 33.9411L52.6482 84.1457C43.2756 93.5183 43.2756 108.714 52.6482 118.087V118.087C62.0208 127.459 77.2167 127.459 86.5893 118.087L136.794 67.8822"
							stroke="currentColor"
							strokeWidth="12"
							strokeLinecap="round"
							variants={pathVariants}
							transition={{
								duration: 0.6,
								ease: 'easeInOut',
								delay: 0.0,
							}}
							animate={controls}
						/>
					</g>
					<defs>
						<clipPath id="clip0_19_13">
							<rect width="180" height="180" fill="white" />
						</clipPath>
					</defs>
				</svg>
			</div>
		)
	},
)

McpIcon.displayName = 'McpIcon'

export { McpIcon }
