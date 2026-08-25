import { Trans } from '@lingui/macro'
import { requireUserWithRole } from '@repo/auth'
import { SidebarInset, SidebarProvider } from '@repo/ui/sidebar'
import { Outlet, useLocation } from 'react-router'
import { AdminSidebar } from '#app/components/admin-sidebar.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { type Route } from './+types/_layout.ts'

export async function loader({ request }: Route.LoaderArgs) {
	// Require admin role for all admin routes
	await requireUserWithRole(request, 'admin')

	return {}
}

export default function AdminLayout() {
	const location = useLocation()
	const isReports =
		location.pathname === '/reports' ||
		location.pathname.startsWith('/reports/')

	return (
		<SidebarProvider
			open={true}
			className={isReports ? 'h-svh overflow-hidden' : undefined}
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 60)',
					'--header-height': isReports ? '0px' : 'calc(var(--spacing) * 12)',
				} as React.CSSProperties
			}
		>
			<AdminSidebar variant="inset" />
			<SidebarInset
				className={
					isReports
						? 'min-h-0 overflow-hidden md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0'
						: undefined
				}
			>
				{isReports ? (
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
						<Outlet />
					</div>
				) : (
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col gap-2 rounded-lg md:px-2">
							<div className="container mx-auto px-4 py-8">
								<Outlet />
							</div>
						</div>
					</div>
				)}
			</SidebarInset>
		</SidebarProvider>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: ({ error }) => (
					<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
						<div className="text-center">
							<h2 className="text-foreground mb-2 text-2xl font-bold">
								<Trans>Access Denied</Trans>
							</h2>
							<p className="text-muted-foreground mb-4">
								<Trans>
									You don't have permission to access this admin area.
								</Trans>
							</p>
							<p className="text-muted-foreground text-sm">
								{error?.data?.message || <Trans>Admin role required</Trans>}
							</p>
						</div>
						<div className="text-center">
							<a
								href="/app"
								className="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								<Trans>Return to App</Trans>
							</a>
						</div>
					</div>
				),
				404: () => (
					<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
						<div className="text-center">
							<h2 className="text-foreground mb-2 text-2xl font-bold">
								<Trans>Page Not Found</Trans>
							</h2>
							<p className="text-muted-foreground mb-4">
								<Trans>The admin page you're looking for doesn't exist.</Trans>
							</p>
						</div>
						<div className="text-center">
							<a
								href="/admin"
								className="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								<Trans>Return to Admin Dashboard</Trans>
							</a>
						</div>
					</div>
				),
			}}
		/>
	)
}
