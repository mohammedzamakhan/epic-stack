import { Outlet, useRouteLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { type loader as rootLoader } from '#app/root.tsx'
import { Logo } from '#app/components/icons/logo.tsx'

export async function loader({ request }: { request: Request }) {
	// This ensures users must be logged in to access any organization routes
	await requireUserId(request)
	return null
}

export default function OrganizationLayout() {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	return (
		<div className="bg-background flex min-h-screen flex-col">
			<header className="border-b shadow-xs">
				<div className="container flex items-center justify-between p-2">
					<Logo />
					<div>{rootData?.user?.name}</div>
				</div>
			</header>
			<div className="bg-muted flex-1">
				<Outlet />
			</div>
		</div>
	)
}
