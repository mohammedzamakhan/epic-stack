import { SidebarInset, SidebarProvider } from '@repo/ui/sidebar'
import { Outlet } from 'react-router'
import { AdminSidebar } from '#app/components/admin-sidebar.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

import { type Route } from './+types/_layout.ts'

export async function loader({ request }: Route.LoaderArgs) {
	// Require admin role for all admin routes
	await requireUserWithRole(request, 'admin')

	return {}
}

export default function AdminLayout() {
	return (
		<SidebarProvider
			open={true}
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 60)',
					'--header-height': 'calc(var(--spacing) * 12)',
				} as React.CSSProperties
			}
		>
			<AdminSidebar variant="inset" />
			<SidebarInset
				style={
					{
						'--sidebar-background': '15 23 42', // slate-900
						'--sidebar-foreground': '248 250 252', // slate-50
						'--sidebar-primary': '248 250 252', // slate-50
						'--sidebar-primary-foreground': '15 23 42', // slate-900
						'--sidebar-accent': '30 41 59', // slate-800
						'--sidebar-accent-foreground': '248 250 252', // slate-50
						'--sidebar-border': '51 65 85', // slate-600
						'--sidebar-ring': '148 163 184', // slate-400
					} as React.CSSProperties
				}
			>
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2 rounded-lg md:px-2">
						<div className="container mx-auto px-4 py-8">
							<Outlet />
						</div>
					</div>
				</div>
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
								Access Denied
							</h2>
							<p className="text-muted-foreground mb-4">
								You don't have permission to access this admin area.
							</p>
							<p className="text-muted-foreground text-sm">
								{error?.data?.message || 'Admin role required'}
							</p>
						</div>
						<div className="text-center">
							<a
								href="/app"
								className="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								Return to App
							</a>
						</div>
					</div>
				),
				404: () => (
					<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
						<div className="text-center">
							<h2 className="text-foreground mb-2 text-2xl font-bold">
								Page Not Found
							</h2>
							<p className="text-muted-foreground mb-4">
								The admin page you're looking for doesn't exist.
							</p>
						</div>
						<div className="text-center">
							<a
								href="/admin"
								className="bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								Return to Admin Dashboard
							</a>
						</div>
					</div>
				),
			}}
		/>
	)
}
