import rss from '@astrojs/rss'
import { brand } from '@repo/config/brand'
import { type APIContext } from 'astro'
import { getPosts } from '../lib/emdash'

export async function GET(context: APIContext) {
	const posts = await getPosts(1, 50)

	return rss({
		title: `${brand.name} Blog`,
		description: brand.products.web.description,
		site: context.site?.toString() || '',
		items: posts.entries.map((post) => ({
			title: post.title,
			pubDate: post.publishedAt ? new Date(post.publishedAt) : new Date(),
			description: post.seo?.description || '',
			link: `/blog/${post.slug}`,
			categories:
				post.categories?.map((cat: { name: string }) => cat.name) || [],
		})),
		customData: `<language>en-us</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<copyright>Copyright ${brand.copyrightYear} ${brand.companyName}</copyright>
<managingEditor>${brand.supportEmail} (${brand.name})</managingEditor>
<webMaster>${brand.supportEmail} (${brand.name})</webMaster>`,
	})
}
