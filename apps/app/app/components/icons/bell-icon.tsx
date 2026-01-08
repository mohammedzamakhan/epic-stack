'use client'

import { type Variants, motion } from 'motion/react'
import { type HTMLAttributes, forwardRef } from 'react'
import { cn } from '#app/utils/misc.tsx'
import {
	type IconAnimationHandle,
	useIconAnimation,
} from './use-icon-animation.tsx'

export interface BellIconHandle extends IconAnimationHandle {}

interface BellIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const svgVariants: Variants = {
	normal: { rotate: 0 },
	animate: { rotate: [0, -10, 10, -10, 0] },
}

const BellIcon = forwardRef<BellIconHandle, BellIconProps>(
	({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
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
				<motion.svg
					xmlns="http://www.w3.org/2000/svg"
					width={size}
					height={size}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					variants={svgVariants}
					animate={controls}
					transition={{
						duration: 0.5,
						ease: 'easeInOut',
					}}
				>
					<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
					<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
				</motion.svg>
			</div>
		)
	},
)

BellIcon.displayName = 'BellIcon'

export { BellIcon }
