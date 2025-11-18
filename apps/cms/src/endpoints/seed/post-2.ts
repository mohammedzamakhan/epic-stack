import { RequiredDataFromCollectionSlug } from 'payload'
import type { PostArgs } from './post-1'
import {
	createHeading,
	createDisclaimerBanner,
	createParagraph,
	createMediaBlock,
	createDynamicComponentsBanner,
} from './helpers.ts'

export const post2: (args: PostArgs) => RequiredDataFromCollectionSlug<'posts'> = ({
	heroImage,
	blockImage,
	author,
}) => {
	return {
		slug: 'global-gaze',
		_status: 'published',
		authors: [author],
		content: {
			root: {
				type: 'root',
				children: [
					createHeading(
						'Explore the untold and overlooked. A magnified view into the corners of the world, where every story deserves its spotlight.',
					),
					createDisclaimerBanner(),
					createHeading('The Power of Resilience: Stories of Recovery and Hope'),
					createParagraph(
						"Throughout history, regions across the globe have faced the devastating impact of natural disasters, the turbulence of political unrest, and the challenging ripples of economic downturns. In these moments of profound crisis, an often-underestimated force emerges: the indomitable resilience of the human spirit. These aren't just tales of mere survival, but stories of communities forging bonds, uniting with a collective purpose, and demonstrating an innate ability to overcome.",
					),
					createMediaBlock(blockImage.id),
					createParagraph(
						'From neighbors forming makeshift rescue teams during floods to entire cities rallying to rebuild after economic collapse, the essence of humanity is most evident in these acts of solidarity. As we delve into these narratives, we witness the transformative power of community spirit, where adversity becomes a catalyst for growth, unity, and a brighter, rebuilt future.',
					),
					createDynamicComponentsBanner(),
				],
				direction: 'ltr',
				format: '',
				indent: 0,
				version: 1,
			},
		},
		heroImage: heroImage.id,
		meta: {
			description:
				'Explore the untold and overlooked. A magnified view into the corners of the world, where every story deserves its spotlight.',
			image: heroImage.id,
			title: 'Global Gaze: Beyond the Headlines',
		},
		relatedPosts: [], // this is populated by the seed script
		title: 'Global Gaze: Beyond the Headlines',
	}
}
