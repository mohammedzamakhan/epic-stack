import { generateSitemap } from '@nasa-gcn/remix-seo'
import { getDomainUrl } from '@repo/common'
import { type Route } from './+types/sitemap[.]xml.ts'
import { serverBuildContext } from '#app/server-context.ts'

export async function loader({ request, context }: Route.LoaderArgs) {
	const serverBuild = context.get(serverBuildContext)
	return generateSitemap(request, serverBuild?.routes as any, {
		siteUrl: getDomainUrl(request),
		headers: {
			'Cache-Control': `public, max-age=${60 * 5}`,
		},
	})
}
