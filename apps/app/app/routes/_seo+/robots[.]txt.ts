import { generateRobotsTxt } from '@nasa-gcn/remix-seo'
import { getDomainUrl } from '@repo/client-utils'
import { type Route } from './+types/robots[.]txt.ts'

export function loader({ request }: Route.LoaderArgs) {
	return generateRobotsTxt([
		{ type: 'sitemap', value: `${getDomainUrl(request)}/sitemap.xml` },
	])
}
