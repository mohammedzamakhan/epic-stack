import {
	MetaDescriptionField,
	MetaImageField,
	MetaTitleField,
	OverviewField,
	PreviewField,
} from '@payloadcms/plugin-seo/fields'
import type { Tab } from 'payload'

/**
 * Creates the standard SEO tab configuration used across collections
 * Reduces duplication between Pages and Posts collections
 */
export function createSEOTab(): Tab {
	return {
		name: 'meta',
		label: 'SEO',
		fields: [
			OverviewField({
				titlePath: 'meta.title',
				descriptionPath: 'meta.description',
				imagePath: 'meta.image',
			}),
			MetaTitleField({
				hasGenerateFn: true,
			}),
			MetaImageField({
				relationTo: 'media',
			}),
			MetaDescriptionField({}),
			PreviewField({
				// if the `generateUrl` function is configured
				hasGenerateFn: true,
				// field paths to match the target field for data
				titlePath: 'meta.title',
				descriptionPath: 'meta.description',
			}),
		],
	}
}
