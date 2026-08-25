'use client'

import { cn } from '@repo/ui'
import { type Variants, motion } from 'motion/react'
import { type HTMLAttributes, forwardRef } from 'react'
import {
	type IconAnimationHandle,
	useIconAnimation,
} from './use-icon-animation.tsx'

export interface UsersRoundIconHandle extends IconAnimationHandle {}

interface UsersRoundIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const pathVariants: Variants = {
	normal: {
		translateX: 0,
		opacity: 1,
		transition: {
			type: 'spring',
			stiffness: 200,
			damping: 13,
		},
	},
	animate: {
		translateX: [-4, 0],
		opacity: [0, 1],
		transition: {
			delay: 0.1,
			type: 'spring',
			stiffness: 200,
			damping: 13,
		},
	},
}

const UsersRoundIcon = forwardRef<UsersRoundIconHandle, UsersRoundIconProps>(
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
				<svg
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
					<path d="M18 21a8 8 0 0 0-16 0" />
					<circle cx="10" cy="8" r="5" />
					<motion.path
						animate={controls}
						d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"
						initial="normal"
						variants={pathVariants}
					/>
				</svg>
			</div>
		)
	},
)

UsersRoundIcon.displayName = 'UsersRoundIcon'

export { UsersRoundIcon }
