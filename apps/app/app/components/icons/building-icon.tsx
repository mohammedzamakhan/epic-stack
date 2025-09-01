'use client'

import {
	type Transition,
	type Variants,
	motion,
	useAnimation,
} from 'motion/react'
import {
	type HTMLAttributes,
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
} from 'react'
import { cn } from '#app/utils/misc.tsx'

export interface BuildingIconHandle {
	startAnimation: () => void
	stopAnimation: () => void
}

interface BuildingIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const defaultTransition: Transition = {
	duration: 0.8,
	opacity: { duration: 0.3 },
}

const pathVariants: Variants = {
	normal: {
		pathLength: 1,
		opacity: 1,
	},
	animate: {
		opacity: [0, 1],
		pathLength: [0, 1],
	},
}

const windowVariants: Variants = {
	normal: {
		pathLength: 1,
		opacity: 1,
	},
	animate: {
		opacity: [0, 1],
		pathLength: [0, 1],
	},
}

const BuildingIcon = forwardRef<BuildingIconHandle, BuildingIconProps>(
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
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					{/* Main building structure */}
					<motion.path
						d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"
						variants={pathVariants}
						transition={defaultTransition}
						animate={controls}
					/>

					{/* Left extension */}
					<motion.path
						d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"
						variants={pathVariants}
						transition={{ ...defaultTransition, delay: 0.2 }}
						animate={controls}
					/>

					{/* Right extension */}
					<motion.path
						d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"
						variants={pathVariants}
						transition={{ ...defaultTransition, delay: 0.3 }}
						animate={controls}
					/>

					{/* Windows - animated in sequence */}
					<motion.path
						d="M10 6h4"
						variants={windowVariants}
						transition={{ ...defaultTransition, delay: 0.5 }}
						animate={controls}
					/>
					<motion.path
						d="M10 10h4"
						variants={windowVariants}
						transition={{ ...defaultTransition, delay: 0.6 }}
						animate={controls}
					/>
					<motion.path
						d="M10 14h4"
						variants={windowVariants}
						transition={{ ...defaultTransition, delay: 0.7 }}
						animate={controls}
					/>
					<motion.path
						d="M10 18h4"
						variants={windowVariants}
						transition={{ ...defaultTransition, delay: 0.8 }}
						animate={controls}
					/>
				</svg>
			</div>
		)
	},
)

BuildingIcon.displayName = 'BuildingIcon'

export { BuildingIcon }
