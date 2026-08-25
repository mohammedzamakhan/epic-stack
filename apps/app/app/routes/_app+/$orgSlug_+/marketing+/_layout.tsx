import { Outlet, useLocation } from 'react-router'

export default function MarketingLayout() {
	const location = useLocation()

	// Builder routes render full-viewport, skip the layout chrome
	const isBuilderRoute =
		/\/marketing\/automations\/(?:new|[^/]+)$/.test(location.pathname) &&
		!location.pathname.endsWith('/runs')

	if (isBuilderRoute) {
		return <Outlet />
	}

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<Outlet />
		</div>
	)
}
