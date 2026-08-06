'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { createRoot, Root } from 'react-dom/client'
import videojs from 'video.js'
import type Player from 'video.js/dist/video-js'
import 'video.js/dist/video-js.css'
import './video-js-markers'

import { cn } from '@repo/ui'
import {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from '@repo/ui/tooltip'
import { createPortal } from 'react-dom'
import {
	Bug,
	Lightbulb,
	Code,
	AlertTriangle,
	MessageSquare,
} from 'lucide-react'
import React from 'react'

export interface ErrorMarker {
	time: number
	type: 'console' | 'network' | 'comment'
	message: string
	originalIndex?: number
	icon?: string
}

export interface VideoPlayerProps {
	src: string
	onPlay?: () => void
	onPause?: () => void
	className?: string
	errorMarkers?: ErrorMarker[]
	onMarkerClick?: (marker: any) => void
}

const commentIconMap = {
	bug: Bug,
	lightbulb: Lightbulb,
	code: Code,
	warning: AlertTriangle,
}

const ArrowSvg = (props: React.ComponentProps<'svg'>) => (
	<svg width="20" height="10" viewBox="0 0 20 10" fill="none" {...props}>
		<path
			d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
			fill="currentColor"
		/>
	</svg>
)

const MarkerIcon = React.forwardRef<
	HTMLDivElement,
	{ marker: any; onMarkerClick: (marker: any) => void }
>(({ marker, onMarkerClick, ...props }, ref) => {
	const label = useMemo(() => {
		if (marker.type === 'network') {
			return marker.text.match(/\b\d{3}\b/)?.[0] || 'ERR'
		} else if (marker.type === 'console') {
			return 'LOG'
		} else if (marker.type === 'comment') {
			return null // We'll show an icon instead
		}
		return marker.label
	}, [marker])

	const CommentIcon = useMemo(() => {
		if (marker.type !== 'comment') return null
		return (
			commentIconMap[marker.icon as keyof typeof commentIconMap] ||
			MessageSquare
		)
	}, [marker.type, marker.icon])

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger
					render={
						<div
							ref={ref}
							title={marker.text}
							className={cn(
								'vjs-marker-content pointer-events-auto flex h-[20px] min-w-[24px] cursor-pointer items-center justify-center rounded px-1 font-bold text-white shadow-sm outline-none',
								marker.type === 'comment'
									? 'text-primary bg-white/20'
									: 'text-[10px]',
								marker.type === 'network'
									? 'bg-red-600'
									: marker.type === 'console'
										? 'bg-orange-500'
										: '',
							)}
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								onMarkerClick(marker)
							}}
							{...props}
							style={{
								zIndex: 9999,
								visibility: 'visible',
								...props.style,
							}}
						>
							{marker.type === 'comment' ? (
								<CommentIcon className="h-4 w-4 fill-current" />
							) : (
								<span className="whitespace-nowrap select-none">{label}</span>
							)}
						</div>
					}
				/>
				<TooltipContent
					side="top"
					sideOffset={8}
					className="z-[99999] border-zinc-800 bg-zinc-900 text-white shadow-2xl"
				>
					{marker.text}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
})

MarkerIcon.displayName = 'MarkerIcon'

export function VideoPlayer({
	src,
	onPlay,
	onPause,
	className,
	errorMarkers = [],
	onMarkerClick,
}: VideoPlayerProps) {
	console.log('VideoPlayer component mounting/rendering', { src })
	const videoRef = useRef<HTMLDivElement>(null)
	const playerRef = useRef<Player | null>(null)
	const prevSrcRef = useRef(src)

	// Use refs for callbacks to avoid re-initializing player when they change
	const onPlayRef = useRef(onPlay)
	const onPauseRef = useRef(onPause)
	const onMarkerClickRef = useRef(onMarkerClick)
	const errorMarkersRef = useRef(errorMarkers)

	onPlayRef.current = onPlay
	onPauseRef.current = onPause
	onMarkerClickRef.current = onMarkerClick
	errorMarkersRef.current = errorMarkers

	useEffect(() => {
		if (!videoRef.current) return

		const videoElement = document.createElement('video-js')
		videoElement.classList.add('vjs-big-play-centered')
		videoRef.current.appendChild(videoElement)

		const player = (playerRef.current = videojs(
			videoElement,
			{
				autoplay: false,
				controls: true,
				responsive: true,
				fluid: true,
				sources: [{ src, type: 'video/mp4' }],
			},
			() => {
				console.log('VideoJS player ready')
				if (typeof player.markers !== 'function') {
					console.error('player.markers plugin NOT found!')
				} else {
					console.log('player.markers plugin found, initializing...')
				}
				player.on('play', () => onPlayRef.current?.())

				player.on('pause', () => onPauseRef.current?.())

				// Initialize markers plugin
				// @ts-ignore
				player.markers({
					onMarkerClick: (marker: any) => {
						onMarkerClickRef.current?.(marker)
					},
					markerStyle: {
						width: '8px',
						height: '8px',
						'background-color': '#ef4444',
						'border-radius': '9999px',
						border: '1px solid white',
						top: '-2px',
						display: 'flex',
						'align-items': 'center',
						'justify-content': 'center',
						color: 'white',
						'font-size': '8px',
						'font-weight': 'bold',
					},
					markerTip: {
						display: false,
					},
					markers: errorMarkersRef.current.map((m) => {
						let label = undefined
						if (m.type === 'network') {
							label = m.message.match(/\b\d{3}\b/)?.[0]
						} else if (m.type === 'console') {
							label = 'LOG'
						} else if (m.type === 'comment') {
							label = '💬'
						}

						return {
							time: m.time,
							text: m.message,
							label: label,
							type: m.type,
							class:
								m.type === 'console'
									? 'console-error'
									: m.type === 'network'
										? 'network-error'
										: 'comment-marker',
							originalIndex: m.originalIndex,
							component: (
								<MarkerIcon
									marker={{ ...m, text: m.message, label }}
									onMarkerClick={(m) => onMarkerClickRef.current?.(m)}
								/>
							),
						}
					}),
				})
			},
		))

		prevSrcRef.current = src

		return () => {
			if (playerRef.current) {
				playerRef.current.dispose()
				playerRef.current = null
			}
		}
	}, []) // Initialize only once

	// Handle src changes separately
	useEffect(() => {
		if (playerRef.current && src !== prevSrcRef.current) {
			playerRef.current.src({ src, type: 'video/mp4' })
			prevSrcRef.current = src
		}
	}, [src])

	// Update markers when errorMarkers change
	useEffect(() => {
		const player = playerRef.current
		if (player && errorMarkers) {
			// @ts-ignore
			player.markers?.reset?.(
				errorMarkers.map((m) => {
					let label = undefined
					if (m.type === 'network') {
						label = m.message.match(/\b\d{3}\b/)?.[0]
					} else if (m.type === 'console') {
						label = 'LOG'
					} else if (m.type === 'comment') {
						label = '💬'
					}

					return {
						time: m.time,
						text: m.message,
						label: label,
						type: m.type,
						class:
							m.type === 'console'
								? 'console-error'
								: m.type === 'network'
									? 'network-error'
									: 'comment-marker',
						originalIndex: m.originalIndex,
						component: (
							<MarkerIcon
								marker={{ ...m, text: m.message, label }}
								onMarkerClick={(m) => onMarkerClickRef.current?.(m)}
							/>
						),
					}
				}),
			)
		}
	}, [errorMarkers])

	return (
		<TooltipProvider>
			<div
				className={cn(
					'bg-muted relative w-full overflow-hidden border shadow-lg',
					className,
				)}
			>
				<div ref={videoRef} className="video-js-container" />

				<style>{`
          .video-js-container .video-js {
            background-color: transparent;
          }
          .video-js-container .vjs-control-bar {
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
          }
          .video-js-container .vjs-big-play-button {
            background-color: var(--primary);
            border-color: var(--primary);
            color: var(--primary-foreground);
            border-radius: 100%;
            width: 2em;
            height: 2em;
            line-height: 2em;
            margin-top: -1em;
            margin-left: -1em;
          }
          .video-js-container .vjs-play-progress {
            background-color: var(--primary);
          }
            .video-js-container .vjs-progress-control {
              position: absolute;
              width: 100%;
              top: -3px;
              height: 5px;
              overflow: visible !important;
            }
            .video-js-container .vjs-progress-control .vjs-progress-holder {
              margin: 0;
              overflow: visible !important;
            }
            .video-js-container .vjs-slider {
              overflow: visible !important;
            }
          .vjs-marker {
            position: absolute;
            cursor: pointer;
            transition: transform 0.15s ease-in-out;
            z-index: 100;
            overflow: visible !important;
          }
          .vjs-marker::after {
            content: '';
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
          }
          .vjs-marker:hover {
            transform: scale(1.1);
            z-index: 200;
          }
            .vjs-marker.network-error {
              width: auto !important;
              height: 20px !important;
              min-width: 20px;
              padding: 0 6px;
              border-radius: 4px !important;
              top: -10px !important;
              font-size: 12px !important;
              line-height: 20px;
              background-color: #ff0000 !important;
              border: 2px solid white !important;
              z-index: 9999 !important;
            }
            .vjs-marker.console-error {
              width: auto !important;
              height: 20px !important;
              min-width: 20px;
              padding: 0 6px;
              border-radius: 4px !important;
              top: -10px !important;
              font-size: 12px !important;
              line-height: 20px;
              background-color: #ef4444 !important;
              border: 2px solid white !important;
              z-index: 9999 !important;
            }

          .vjs-marker.comment-marker {
            background-color: transparent !important;
            border: none !important;
            font-size: 14px !important;
            top: -8px !important;
            padding: 0 !important;
            width: auto !important;
            height: auto !important;
          }
          .vjs-tip {
            visibility: hidden;
            display: block;
            opacity: 1;
            padding: 8px;
            font-size: 12px;
            position: absolute;
            bottom: 25px;
            background-color: var(--popover);
            color: var(--popover-foreground);
            border-radius: 6px;
            border: 1px solid var(--border);
            z-index: 100;
            max-width: 200px;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          }
          .vjs-tip-inner {
            line-clamp: 2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .vjs-tip-arrow {
            position: absolute;
            bottom: -6px;
            left: 50%;
            margin-left: -6px;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid var(--popover);
          }
          `}</style>
			</div>
		</TooltipProvider>
	)
}

export default VideoPlayer
