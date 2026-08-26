'use client'

import { cn } from '@repo/ui'
import { type Variants, motion, useReducedMotion } from 'motion/react'
import { type HTMLAttributes, forwardRef } from 'react'
import {
	type IconAnimationHandle,
	useIconAnimation,
} from './use-icon-animation.tsx'

export interface ChartPieIconHandle extends IconAnimationHandle {}

interface ChartPieIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const PATH_VARIANTS: Variants = {
	normal: { translateX: 0, translateY: 0 },
	animate: { translateX: 1.1, translateY: -1.1 },
}

const REDUCED_PATH_VARIANTS: Variants = {
	normal: { translateX: 0, translateY: 0 },
	animate: { translateX: 0, translateY: 0 },
}

const ChartPieIcon = forwardRef<ChartPieIconHandle, ChartPieIconProps>(
	({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
		const shouldReduceMotion = useReducedMotion()
		const { controls, handleMouseEnter, handleMouseLeave } = useIconAnimation(
			ref,
			{ onMouseEnter, onMouseLeave },
		)

		return (
			<div
				className={cn(className)}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				{...props}
			>
				<svg
					className="overflow-visible"
					fill="none"
					height={size}
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
					viewBox="0 0 24 24"
					width={size}
					xmlns="http://www.w3.org/2000/svg"
				>
					<motion.path
						animate={controls}
						d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"
						initial="normal"
						transition={{
							type: 'spring',
							stiffness: 250,
							damping: 15,
							bounce: 0.6,
						}}
						variants={
							shouldReduceMotion ? REDUCED_PATH_VARIANTS : PATH_VARIANTS
						}
					/>
					<path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
				</svg>
			</div>
		)
	},
)

ChartPieIcon.displayName = 'ChartPieIcon'

export { ChartPieIcon }
