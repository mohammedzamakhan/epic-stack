import { type Experimental_GeneratedImage } from 'ai'
import { cn } from '@repo/ui/cn'

export type ImageProps = Experimental_GeneratedImage & {
	className?: string
	alt?: string
	mediaType?: string
	_uint8Array?: Uint8Array
}

export const Image = ({
	base64,
	_uint8Array,
	mediaType = 'image/png',
	...props
}: ImageProps) => (
	<img
		{...props}
		src={`data:${mediaType};base64,${base64}`}
		alt={props.alt ?? ''}
		loading="lazy"
		decoding="async"
		className={cn(
			'h-auto max-w-full overflow-hidden rounded-md',
			props.className,
		)}
	/>
)
