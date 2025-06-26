import { Outlet, useLoaderData } from 'react-router'
import { MarketingLayout } from '#app/components/marketing-layout'
import { getSidebarState } from '#app/utils/sidebar-cookie.server'

export async function loader({ request }: { request: Request }) {
	const isCollapsed = await getSidebarState(request)
	return { isCollapsed }
}

export default function MarketingLayoutRoute() {
	const { isCollapsed } = useLoaderData<{ isCollapsed: boolean }>()

	return (
		<MarketingLayout isCollapsed={isCollapsed}>
			<Outlet />
		</MarketingLayout>
	)
}
