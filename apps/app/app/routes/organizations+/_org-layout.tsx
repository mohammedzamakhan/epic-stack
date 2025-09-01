import { Outlet, useRouteLoaderData } from 'react-router'
import { Logo } from '#app/components/icons/logo.tsx'
import { type loader as rootLoader } from '#app/root.tsx'
import { requireUserId } from '#app/utils/auth.server'

export async function loader({ request }: { request: Request }) {
	// This ensures users must be logged in to access any organization routes
	await requireUserId(request)
	return null
}

export default function OrganizationLayout() {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	return (
		<div className="bg-background flex min-h-screen flex-col">
			<header className="border-b p-2 shadow-xs">
				<div className="container flex items-center justify-between p-2">
					<Logo />
					<div>{rootData?.user?.name}</div>
				</div>
			</header>
			<div className="bg-muted/10 flex-1">
				<Outlet />
			</div>
		</div>
	)
}
