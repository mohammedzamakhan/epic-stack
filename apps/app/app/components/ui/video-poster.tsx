import { getVideoClipSrc, getVideoPosterSrc } from '@repo/common'
import { cn } from '@repo/ui'
import { useState } from 'react'

export function VideoPoster({
	objectKey,
	organizationId,
	mediaTransformBaseUrl,
	alt,
	className,
	width,
	height,
}: {
	objectKey: string
	organizationId?: string
	mediaTransformBaseUrl?: string | null
	alt?: string
	className?: string
	width?: number
	height?: number
}) {
	const [isHovering, setIsHovering] = useState(false)
	const posterSrc = getVideoPosterSrc(
		objectKey,
		organizationId,
		mediaTransformBaseUrl,
	)
	const clipSrc = getVideoClipSrc(
		objectKey,
		organizationId,
		mediaTransformBaseUrl,
	)
	const showClip = isHovering && mediaTransformBaseUrl && clipSrc !== posterSrc

	return (
		<div
			className={cn('relative overflow-hidden', className)}
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
		>
			{showClip ? (
				<video
					src={clipSrc}
					className="h-full w-full object-cover"
					autoPlay
					muted
					loop
					playsInline
					width={width}
					height={height}
				/>
			) : (
				<img
					src={posterSrc}
					alt={alt ?? 'Video poster'}
					className="h-full w-full object-cover"
					width={width}
					height={height}
				/>
			)}
		</div>
	)
}
