import { cn } from '#app/utils/misc'
import type { Experimental_GeneratedImage } from 'ai'

export type ImageProps = Experimental_GeneratedImage & {
	className?: string
	alt?: string
}

export const Image = ({
	base64,
	uint8Array,
	mediaType = 'image/png',
	...props
}: ImageProps) => (
	<img
		{...props}
		src={`data:${mediaType};base64,${base64}`}
		alt={props.alt}
		className={cn(
			'h-auto max-w-full overflow-hidden rounded-md',
			props.className,
		)}
	/>
)
