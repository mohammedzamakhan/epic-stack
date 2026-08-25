import rss from '@astrojs/rss'
import { brand } from '@repo/config/brand'
import { type APIContext } from 'astro'
import { getEmDashCollection } from 'emdash'

export async function GET(context: APIContext) {
	const { entries: posts } = await getEmDashCollection('posts', { limit: 50 })

	return rss({
		title: `${brand.name} Blog`,
		description: brand.products.web.description,
		site: context.site?.toString() || '',
		items: posts.map((post) => ({
			title: post.data.title,
			pubDate: post.data.publishedAt ? new Date(post.data.publishedAt) : new Date(),
			description: post.data.meta?.description || '',
			link: `/blog/${post.id}`,
			categories:
				post.data.categories?.map((cat: { title: string }) => cat.title) || [],
		})),
		customData: `<language>en-us</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<copyright>Copyright ${brand.copyrightYear} ${brand.companyName}</copyright>
<managingEditor>${brand.supportEmail} (${brand.name})</managingEditor>
<webMaster>${brand.supportEmail} (${brand.name})</webMaster>`,
	})
}
