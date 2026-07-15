import { generateSitemap } from '@nasa-gcn/remix-seo'
import { getDomainUrl } from '@repo/common'
import { type Route } from './+types/sitemap[.]xml.ts'
import type { ServerBuild } from '@remix-run/server-runtime'

export async function loader({ request, context }: Route.LoaderArgs) {
	return generateSitemap(
		request,
		context.serverBuild.routes as unknown as ServerBuild['routes'],
		{
			siteUrl: getDomainUrl(request),
			headers: {
				'Cache-Control': `public, max-age=${60 * 5}`,
			},
		},
	)
}
