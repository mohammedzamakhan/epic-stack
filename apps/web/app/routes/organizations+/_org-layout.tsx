import { Outlet, useRouteLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { type loader as rootLoader } from '#app/root.tsx'

export async function loader({ request }: { request: Request }) {
	// This ensures users must be logged in to access any organization routes
	await requireUserId(request)
	return null
}

function Logo() {
	return (
		<div className="group grid leading-snug">
			<span className="font-light transition group-hover:-translate-x-1">
				epic
			</span>
			<span className="font-bold transition group-hover:translate-x-1">
				notes
			</span>
		</div>
	)
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
