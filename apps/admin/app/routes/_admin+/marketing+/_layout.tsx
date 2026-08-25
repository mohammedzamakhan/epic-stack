import { Outlet, useLocation } from 'react-router'

export default function MarketingLayout() {
	const location = useLocation()

	const isBuilderRoute =
		/\/marketing\/automations\/(?:new|[^/]+)$/.test(location.pathname) &&
		!location.pathname.endsWith('/runs')

	if (isBuilderRoute) {
		return <Outlet />
	}

	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-8">
			<Outlet />
		</div>
	)
}
