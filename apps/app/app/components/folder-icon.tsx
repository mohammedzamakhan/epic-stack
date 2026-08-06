'use client'

import { motion } from 'framer-motion'
import { useId } from 'react'

export const FOLDER_COLORS = {
	gray: {
		base: '#6B7280',
		glass: 'rgba(107, 114, 128, 0.6)',
	},
	blue: {
		base: '#3B82F6',
		glass: 'rgba(59, 130, 246, 0.6)',
	},
	green: {
		base: '#22C55E',
		glass: 'rgba(34, 197, 94, 0.6)',
	},
	red: {
		base: '#EF4444',
		glass: 'rgba(239, 68, 68, 0.6)',
	},
	yellow: {
		base: '#EAB308',
		glass: 'rgba(234, 179, 8, 0.6)',
	},
	purple: {
		base: '#8B5CF6',
		glass: 'rgba(139, 92, 246, 0.6)',
	},
	orange: {
		base: '#F97316',
		glass: 'rgba(249, 115, 22, 0.6)',
	},
} as const

export type FolderColor = keyof typeof FOLDER_COLORS

interface FolderIconProps {
	fileCount?: number
	className?: string
	width?: number
	height?: number
	isHovered?: boolean
	color?: FolderColor
}

export function FolderIcon({
	fileCount = 0,
	className,
	width = 200,
	height = 171.304,
	isHovered = false,
	color = 'gray',
}: FolderIconProps) {
	const uniqueId = useId()
	const backGradientId = `backGradient-${uniqueId}`
	const frontGradientId = `frontGradient-${uniqueId}`
	const glassGradientId = `glassGradient-${uniqueId}`
	const blurFilterId = `blurFilter-${uniqueId}`

	const colorScheme = FOLDER_COLORS[color]

	const visibleFiles = Math.min(Math.max(0, fileCount), 6)

	const filePositions = [
		{ x: 25, y: 5, rotation: -3 },
		{ x: 55, y: 0, rotation: -1 },
		{ x: 85, y: -2, rotation: 1 },
		{ x: 115, y: 0, rotation: 2 },
		{ x: 145, y: 5, rotation: 4 },
		{ x: 130, y: 8, rotation: 3 },
	]

	const fileWidth = 55
	const fileHeight = 70
	const borderRadius = 6

	const files = Array.from({ length: visibleFiles }, (_, index) => {
		const pos = filePositions[index] as {
			x: number
			y: number
			rotation: number
		}

		return (
			<g
				key={index}
				transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.rotation}, ${fileWidth / 2}, ${fileHeight / 2})`}
			>
				<rect
					width={fileWidth}
					height={fileHeight}
					rx={borderRadius}
					fill="rgba(255, 255, 255, 0.9)"
					stroke="rgba(0, 0, 0, 0.06)"
					strokeWidth={1}
				/>
				<rect
					x="10"
					y="16"
					width="28"
					height="3"
					rx="1.5"
					fill="rgba(0, 0, 0, 0.08)"
				/>
				<rect
					x="10"
					y="24"
					width="35"
					height="3"
					rx="1.5"
					fill="rgba(0, 0, 0, 0.06)"
				/>
				<rect
					x="10"
					y="32"
					width="30"
					height="3"
					rx="1.5"
					fill="rgba(0, 0, 0, 0.06)"
				/>
			</g>
		)
	})

	return (
		<motion.svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 -30 230 197"
			fill="none"
			className={className}
			style={{ cursor: 'pointer' }}
		>
			<defs>
				<filter id={blurFilterId} x="-20%" y="-20%" width="140%" height="140%">
					<feGaussianBlur in="SourceGraphic" stdDeviation="1" />
				</filter>

				<linearGradient
					id={backGradientId}
					x1="112"
					y1="1"
					x2="112"
					y2="164"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor={colorScheme.base} stopOpacity="0.5" />
					<stop offset="1" stopColor={colorScheme.base} stopOpacity="0.35" />
				</linearGradient>

				<linearGradient
					id={frontGradientId}
					x1="115"
					y1="16"
					x2="115"
					y2="165"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor={colorScheme.base} />
					<stop offset="1" stopColor={colorScheme.base} stopOpacity="0.9" />
				</linearGradient>

				<linearGradient
					id={glassGradientId}
					x1="115"
					y1="16"
					x2="115"
					y2="54"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="white" stopOpacity="0.35" />
					<stop offset="1" stopColor="white" stopOpacity="0" />
				</linearGradient>
			</defs>

			<rect
				x="1"
				y="1"
				width="223"
				height="163"
				rx="12"
				fill={`url(#${backGradientId})`}
			/>
			<rect
				x="1"
				y="1"
				width="223"
				height="163"
				rx="12"
				stroke="rgba(255, 255, 255, 0.15)"
				strokeWidth="1"
				fill="none"
			/>

			{files}

			<motion.g
				initial={false}
				animate={{
					scaleY: isHovered ? 0.88 : 1,
				}}
				transition={{
					type: 'spring',
					stiffness: 400,
					damping: 25,
				}}
				style={{ originY: 1 }}
			>
				<path
					d="M0 29.6C0 22.2 5.5 16.6 13 16.6H106.5C115.7 16.6 120.4 16.6 125 21.3C129.6 25.9 134.3 35.2 143.5 37.5C152.8 39.8 162 38.9 171.3 38.9H218.5C225.9 38.9 231.5 44.5 231.5 51.9V152C231.5 159.4 225.9 165 218.5 165H13C5.5 165 0 159.4 0 152V29.6Z"
					fill={`url(#${frontGradientId})`}
				/>

				<path
					d="M0 29.6C0 22.2 5.5 16.6 13 16.6H106.5C115.7 16.6 120.4 16.6 125 21.3C129.6 25.9 134.3 35.2 143.5 37.5C152.8 39.8 162 38.9 171.3 38.9H218.5C225.9 38.9 231.5 44.5 231.5 51.9V152C231.5 159.4 225.9 165 218.5 165H13C5.5 165 0 159.4 0 152V29.6Z"
					stroke="rgba(255, 255, 255, 0.2)"
					strokeWidth="1"
					fill="none"
				/>

				<path
					d="M1 30C1 23 6 17.5 13 17.5H106C115 17.5 119.5 17.5 124 22C128.5 26.5 133 35 142 37C151 39 160 38 169 38H218C225 38 230.5 43.5 230.5 51V53C230.5 45.5 225 40 218 40H169C160 40 151 40.5 142 38.5C133 36.5 128.5 28 124 23.5C119.5 19 115 19 106 19H13C6.5 19 1.5 23 1 29V30Z"
					fill={`url(#${glassGradientId})`}
				/>
			</motion.g>
		</motion.svg>
	)
}
