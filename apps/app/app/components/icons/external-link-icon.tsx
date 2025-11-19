'use client'

import  { type Variants, motion  } from 'motion/react'
import  { type HTMLAttributes, forwardRef  } from 'react'
import { cn } from '#app/utils/misc.tsx'
import {
	type IconAnimationHandle,
	useIconAnimation,
} from './use-icon-animation.tsx'

export interface ExternalLinkIconHandle extends IconAnimationHandle {}

interface ExternalLinkIconProps extends HTMLAttributes<HTMLDivElement> {
	size?: number
}

const arrowVariants: Variants = {
	animate: {
		translateX: [0, 1, 0],
		translateY: [0, -1, 0],
		transition: {
			duration: 0.4,
		},
	},
}

const ExternalLinkIcon = forwardRef<
	ExternalLinkIconHandle,
	ExternalLinkIconProps
>(({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
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
				<motion.path
					d="M15 3h6v6"
					variants={arrowVariants}
					animate={controls}
				/>
				<motion.path
					d="M10 14 21 3"
					variants={arrowVariants}
					animate={controls}
				/>
				<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
			</svg>
		</div>
	)
})

ExternalLinkIcon.displayName = 'ExternalLinkIcon'

export { ExternalLinkIcon }
