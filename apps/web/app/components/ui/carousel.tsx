// Re-export carousel components from the UI package with Icon integration
import { IconAdapter } from '#app/components/ui/icon-adapter'
import {
	type CarouselApi,
	Carousel as BaseCarousel,
	CarouselContent,
	CarouselItem,
	CarouselPrevious,
	CarouselNext,
	useCarousel,
} from '@repo/ui'
import * as React from 'react'

// Wrapper that provides Icon component to Carousel
function Carousel(props: React.ComponentProps<typeof BaseCarousel>) {
	return <BaseCarousel {...props} IconComponent={IconAdapter} />
}

export {
	type CarouselApi,
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselPrevious,
	CarouselNext,
	useCarousel,
}
