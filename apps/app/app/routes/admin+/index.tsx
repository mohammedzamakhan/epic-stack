import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { Link } from 'react-router'

import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/index.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')

	// Get key metrics and system status
	const [
		totalUsers,
		totalOrganizations,
		activeOrganizations,
		totalNotes,
		totalSessions,
		recentUsers,
		recentOrganizations,
		subscriptionStats,
	] = await Promise.all([
		// Total users count
		prisma.user.count(),

		// Total organizations count
		prisma.organization.count(),

		// Active organizations count
		prisma.organization.count({
			where: { active: true },
		}),

		// Total notes count (personal + organization)
		Promise.all([prisma.note.count(), prisma.organizationNote.count()]).then(
			([personal, org]) => personal + org,
		),

		// Active sessions count
		prisma.session.count({
			where: {
				expirationDate: {
					gt: new Date(),
				},
			},
		}),

		// Recent users (last 7 days)
		prisma.user.count({
			where: {
				createdAt: {
					gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				},
			},
		}),

		// Recent organizations (last 7 days)
		prisma.organization.count({
			where: {
				createdAt: {
					gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				},
			},
		}),

		// Subscription statistics
		prisma.organization.groupBy({
			by: ['subscriptionStatus'],
			_count: {
				subscriptionStatus: true,
			},
		}),
	])

	return {
		metrics: {
			totalUsers,
			totalOrganizations,
			activeOrganizations,
			totalNotes,
			totalSessions,
			recentUsers,
			recentOrganizations,
			subscriptionStats,
		},
	}
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
	const { metrics } = loaderData

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h1 className="text-foreground text-3xl font-bold">Admin Dashboard</h1>
				<p className="text-muted-foreground mt-2">
					Manage users, organizations, and system settings
				</p>
			</div>

			{/* Key Metrics Section */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Users</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{metrics.totalUsers.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							+{metrics.recentUsers} new this week
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Organizations</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<path d="M3 21h18" />
							<path d="M5 21V7l8-4v18" />
							<path d="M19 21V11l-6-4" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{metrics.totalOrganizations.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							{metrics.activeOrganizations} active • +
							{metrics.recentOrganizations} new this week
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Notes</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14,2 14,8 20,8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<polyline points="10,9 9,9 8,9" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{metrics.totalNotes.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							Personal + Organization notes
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Active Sessions
						</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<circle cx="12" cy="12" r="3" />
							<path d="M12 1v6m0 6v6" />
							<path d="m15.14 8.86 4.24-4.24M4.62 19.38l4.24-4.24M16.86 15.14l4.24 4.24M4.62 4.62l4.24 4.24" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{metrics.totalSessions.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							Currently logged in users
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Subscription Status */}
			{metrics.subscriptionStats.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg font-medium">
							Subscription Status
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-4 md:grid-cols-3">
							{metrics.subscriptionStats.map((stat) => (
								<div
									key={stat.subscriptionStatus || 'none'}
									className="text-center"
								>
									<div className="text-2xl font-bold">
										{stat._count.subscriptionStatus}
									</div>
									<p className="text-muted-foreground text-sm capitalize">
										{stat.subscriptionStatus || 'No Subscription'}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Management Cards */}
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card className="transition-shadow">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Users</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
							<path d="M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">Manage Users</div>
						<p className="text-muted-foreground mt-1 text-xs">
							View, search, and manage user accounts
						</p>
						<Link
							to="/admin/users"
							className="text-primary mt-2 inline-flex items-center text-sm hover:underline"
						>
							View Users →
						</Link>
					</CardContent>
				</Card>

				<Card className="transition-shadow">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Organizations</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<path d="M3 21h18" />
							<path d="M5 21V7l8-4v18" />
							<path d="M19 21V11l-6-4" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">Manage Organizations</div>
						<p className="text-muted-foreground mt-1 text-xs">
							View organization details and subscriptions
						</p>
						<Link
							to="/admin/organizations"
							className="text-primary mt-2 inline-flex items-center text-sm hover:underline"
						>
							View Organizations →
						</Link>
					</CardContent>
				</Card>

				<Card className="transition-shadow">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Cache</CardTitle>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							className="text-muted-foreground h-4 w-4"
						>
							<ellipse cx="12" cy="5" rx="9" ry="3" />
							<path d="M3 5v14a9 3 0 0 0 18 0V5" />
							<path d="M3 12a9 3 0 0 0 18 0" />
						</svg>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">Cache Management</div>
						<p className="text-muted-foreground mt-1 text-xs">
							Monitor and manage system cache
						</p>
						<Link
							to="/admin/cache"
							className="text-primary mt-2 inline-flex items-center text-sm hover:underline"
						>
							Manage Cache →
						</Link>
					</CardContent>
				</Card>
			</div>

			{/* Quick Actions */}
			<div className="mt-8">
				<h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<Link
						to="/admin/users"
						className="hover:bg-muted/50 flex items-center rounded-lg border p-4 transition-colors"
					>
						<div className="mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								className="h-5 w-5"
							>
								<circle cx="11" cy="11" r="8" />
								<path d="M21 21l-4.35-4.35" />
							</svg>
						</div>
						<div>
							<div className="font-medium">Search Users</div>
							<div className="text-muted-foreground text-sm">
								Find and manage user accounts
							</div>
						</div>
					</Link>

					<Link
						to="/admin/organizations"
						className="hover:bg-muted/50 flex items-center rounded-lg border p-4 transition-colors"
					>
						<div className="mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								className="h-5 w-5"
							>
								<path d="M3 21h18" />
								<path d="M5 21V7l8-4v18" />
								<path d="M19 21V11l-6-4" />
							</svg>
						</div>
						<div>
							<div className="font-medium">View Organizations</div>
							<div className="text-muted-foreground text-sm">
								Monitor organization activity
							</div>
						</div>
					</Link>

					<Link
						to="/admin/cache"
						className="hover:bg-muted/50 flex items-center rounded-lg border p-4 transition-colors"
					>
						<div className="mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								className="h-5 w-5"
							>
								<ellipse cx="12" cy="5" rx="9" ry="3" />
								<path d="M3 5v14a9 3 0 0 0 18 0V5" />
								<path d="M3 12a9 3 0 0 0 18 0" />
							</svg>
						</div>
						<div>
							<div className="font-medium">Clear Cache</div>
							<div className="text-muted-foreground text-sm">
								Manage system performance
							</div>
						</div>
					</Link>
				</div>
			</div>
		</div>
	)
}
