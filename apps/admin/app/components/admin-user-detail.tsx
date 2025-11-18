import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Separator } from '@repo/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs'
import { Icon } from '@repo/ui/icon'
import { useNavigate, useSubmit } from 'react-router'

import { BanUserDialog } from '#app/components/admin-ban-user-dialog.tsx'

import { getUserImgSrc } from '#app/utils/misc.tsx'
import { type getIpAddressesByUser } from '#app/utils/ip-tracking.server.ts'

export interface AdminUserDetail {
	id: string
	name: string | null
	email: string
	username: string
	createdAt: string
	updatedAt: string
	hasPassword: boolean
	isBanned: boolean
	banReason: string | null
	banExpiresAt: string | null
	bannedAt: string | null
	bannedBy?: {
		id: string
		name: string | null
		username: string
	} | null
	image?: {
		id: string
		altText: string | null
	} | null
	organizations: Array<{
		organizationRole: {
			id: string
			name: string
			level: number
		}
		active: boolean
		isDefault: boolean
		createdAt: string
		department: string | null
		organization: {
			id: string
			name: string
			slug: string
			description: string | null
			active: boolean
			subscriptionStatus: string | null
			planName: string | null
		}
	}>
	sessions: Array<{
		id: string
		createdAt: string
		expirationDate: string
	}>
	connections: Array<{
		id: string
		providerName: string
		providerId: string
		createdAt: string
	}>
	roles: Array<{
		id: string
		name: string
		description: string
	}>
	notes: Array<{
		id: string
		title: string
		createdAt: string
		updatedAt: string
	}>
}

export interface RecentActivity {
	comments: Array<{
		id: string
		content: string
		createdAt: string
		note: {
			id: string
			title: string
		}
	}>
	activityLogs: Array<{
		id: string
		action: string
		createdAt: string
		note: {
			id: string
			title: string
		}
	}>
}

interface UserDetailViewProps {
	user: AdminUserDetail
	recentActivity: RecentActivity
	ipAddresses: Awaited<ReturnType<typeof getIpAddressesByUser>>
}

export function UserDetailView({
	user,
	recentActivity,
	ipAddresses,
}: UserDetailViewProps) {
	const navigate = useNavigate()
	const submit = useSubmit()
	const [showBanDialog, setShowBanDialog] = useState(false)

	const handleBanUser = () => {
		setShowBanDialog(true)
	}

	const handleLiftBan = () => {
		const formData = new FormData()
		formData.append('intent', 'lift-ban')

		void submit(formData, {
			method: 'POST',
			action: `/users/${user.id}/ban`,
		})
	}

	const handleImpersonateUser = () => {
		const formData = new FormData()
		void submit(formData, {
			method: 'POST',
			action: `/users/${user.id}/impersonate`,
		})
	}

	const handleEditUser = () => {
		// TODO: Navigate to edit user page
		console.log('Edit user:', user.id)
	}

	// Check if ban is expired
	const isBanExpired =
		user.isBanned &&
		user.banExpiresAt &&
		new Date(user.banExpiresAt) <= new Date()

	const activeSessions = user.sessions.filter(
		(session) => new Date(session.expirationDate) > new Date(),
	)

	return (
		<>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Separator orientation="vertical" className="h-6" />
						<div className="flex items-center gap-3">
							<Avatar className="h-12 w-12">
								<AvatarImage
									src={getUserImgSrc(user.image?.id)}
									alt={user.image?.altText ?? user.name ?? user.username}
								/>
								<AvatarFallback>
									{(user.name ?? user.username).slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-2xl font-bold">
										{user.name || user.username}
									</h1>
									{user.isBanned && (
										<Badge variant="destructive" className="gap-1">
											<Icon name="ban" className="h-3 w-3" />
											{isBanExpired ? 'Ban Expired' : 'Banned'}
										</Badge>
									)}
								</div>
								<p className="text-muted-foreground">{user.email}</p>
								{user.isBanned && user.banReason && (
									<p className="text-destructive mt-1 text-sm">
										<Icon
											name="alert-triangle"
											className="mr-1 inline h-4 w-4"
										/>
										{user.banReason}
									</p>
								)}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleEditUser}
							className="gap-2"
						>
							<Icon name="edit" className="h-4 w-4" />
							Edit
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleImpersonateUser}
							className="gap-2"
							disabled={user.isBanned && !isBanExpired}
						>
							<Icon name="user" className="h-4 w-4" />
							Impersonate
						</Button>
						{user.isBanned ? (
							<Button
								variant="outline"
								size="sm"
								onClick={handleLiftBan}
								className="gap-2"
							>
								<Icon name="shield-check" className="h-4 w-4" />
								Lift Ban
							</Button>
						) : (
							<Button
								variant="destructive"
								size="sm"
								onClick={handleBanUser}
								className="gap-2"
							>
								<Icon name="ban" className="h-4 w-4" />
								Ban User
							</Button>
						)}
					</div>
				</div>

				{/* Overview Cards */}
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Organizations
							</CardTitle>
							<Icon name="building" className="text-muted-foreground h-4 w-4" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{user.organizations.length}
							</div>
							<p className="text-muted-foreground text-xs">
								{user.organizations.filter((org) => org.active).length} active
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Active Sessions
							</CardTitle>
							<Icon name="key" className="text-muted-foreground h-4 w-4" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{activeSessions.length}</div>
							<p className="text-muted-foreground text-xs">
								{user.sessions.length} total sessions
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Notes Created
							</CardTitle>
							<Icon
								name="file-text"
								className="text-muted-foreground h-4 w-4"
							/>
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{user.notes.length}</div>
							<p className="text-muted-foreground text-xs">
								Recent notes shown
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">Security</CardTitle>
							<Icon name="shield" className="text-muted-foreground h-4 w-4" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{user.hasPassword ? '✓' : '✗'}
							</div>
							<p className="text-muted-foreground text-xs">0 passkeys</p>
						</CardContent>
					</Card>
				</div>

				{/* Detailed Information */}
				<Tabs defaultValue="overview" className="space-y-4">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="organizations">Organizations</TabsTrigger>
						<TabsTrigger value="activity">Activity</TabsTrigger>
						<TabsTrigger value="security">Security</TabsTrigger>
						<TabsTrigger value="ip-addresses">IP Addresses</TabsTrigger>
					</TabsList>

					<TabsContent value="overview" className="space-y-4">
						{user.isBanned && (
							<Card className="border-destructive">
								<CardHeader>
									<CardTitle className="text-destructive flex items-center gap-2">
										<Icon name="ban" className="h-5 w-5" />
										Ban Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="grid gap-2">
										<div className="flex items-center gap-2 text-sm">
											<span className="font-medium">Status:</span>
											<Badge variant="destructive">
												{isBanExpired ? 'Ban Expired' : 'Banned'}
											</Badge>
										</div>
										{user.banReason && (
											<div className="flex items-start gap-2 text-sm">
												<span className="font-medium">Reason:</span>
												<span className="flex-1">{user.banReason}</span>
											</div>
										)}
										{user.bannedAt && (
											<div className="flex items-center gap-2 text-sm">
												<span className="font-medium">Banned:</span>
												<span>{new Date(user.bannedAt).toLocaleString()}</span>
											</div>
										)}
										{user.banExpiresAt && (
											<div className="flex items-center gap-2 text-sm">
												<span className="font-medium">Expires:</span>
												<span
													className={
														isBanExpired ? 'text-muted-foreground' : ''
													}
												>
													{new Date(user.banExpiresAt).toLocaleString()}
													{isBanExpired && ' (Expired)'}
												</span>
											</div>
										)}
										{user.bannedBy && (
											<div className="flex items-center gap-2 text-sm">
												<span className="font-medium">Banned by:</span>
												<span>
													{user.bannedBy.name || user.bannedBy.username}
												</span>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}
						<div className="grid gap-4 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Icon name="user" className="h-5 w-5" />
										User Information
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid gap-2">
										<div className="flex items-center gap-2 text-sm">
											<Icon
												name="mail"
												className="text-muted-foreground h-4 w-4"
											/>
											<span className="font-medium">Email:</span>
											<span>{user.email}</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<Icon
												name="user"
												className="text-muted-foreground h-4 w-4"
											/>
											<span className="font-medium">Username:</span>
											<span className="font-mono">{user.username}</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<Icon
												name="calendar"
												className="text-muted-foreground h-4 w-4"
											/>
											<span className="font-medium">Created:</span>
											<span>
												{new Date(user.createdAt).toLocaleDateString()}
											</span>
										</div>
										<div className="flex items-center gap-2 text-sm">
											<Icon
												name="calendar"
												className="text-muted-foreground h-4 w-4"
											/>
											<span className="font-medium">Updated:</span>
											<span>
												{new Date(user.updatedAt).toLocaleDateString()}
											</span>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Icon name="shield" className="h-5 w-5" />
										Roles & Permissions
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{user.roles.length > 0 ? (
											user.roles.map((role) => (
												<div
													key={role.id}
													className="flex items-center justify-between"
												>
													<Badge variant="secondary">{role.name}</Badge>
													<span className="text-muted-foreground text-xs">
														{role.description}
													</span>
												</div>
											))
										) : (
											<p className="text-muted-foreground text-sm">
												No roles assigned
											</p>
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="organizations" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>Organization Memberships</CardTitle>
								<CardDescription>
									Organizations this user belongs to
								</CardDescription>
							</CardHeader>
							<CardContent>
								{user.organizations.length > 0 ? (
									<div className="space-y-4">
										{user.organizations.map((membership) => (
											<div
												key={membership.organization.id}
												className="flex items-center justify-between rounded-lg border p-4"
											>
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<h4 className="font-medium">
															{membership.organization.name}
														</h4>
														{membership.isDefault && (
															<Badge variant="outline" className="text-xs">
																Default
															</Badge>
														)}
														{!membership.active && (
															<Badge variant="destructive" className="text-xs">
																Inactive
															</Badge>
														)}
													</div>
													<p className="text-muted-foreground text-sm">
														{membership.organization.description ||
															'No description'}
													</p>
													<div className="text-muted-foreground flex items-center gap-4 text-xs">
														<span>
															Role: {membership.organizationRole.name}
														</span>
														{membership.department && (
															<span>Department: {membership.department}</span>
														)}
														<span>
															Joined:{' '}
															{new Date(
																membership.createdAt,
															).toLocaleDateString()}
														</span>
													</div>
												</div>
												<div className="flex items-center gap-2">
													{membership.organization.subscriptionStatus && (
														<Badge variant="outline">
															{membership.organization.subscriptionStatus}
														</Badge>
													)}
													<Button
														variant="ghost"
														size="sm"
														onClick={() =>
															navigate(
																`/organizations/${membership.organization.id}`,
															)
														}
													>
														<Icon name="external-link" className="h-4 w-4" />
													</Button>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										User is not a member of any organizations
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="activity" className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Icon name="message-circle" className="h-5 w-5" />
										Recent Comments
									</CardTitle>
								</CardHeader>
								<CardContent>
									{recentActivity.comments.length > 0 ? (
										<div className="space-y-3">
											{recentActivity.comments.map((comment) => (
												<div key={comment.id} className="space-y-1">
													<p className="text-sm">{comment.content}</p>
													<div className="text-muted-foreground flex items-center gap-2 text-xs">
														<span>On: {comment.note.title}</span>
														<span>•</span>
														<span>
															{new Date(comment.createdAt).toLocaleDateString()}
														</span>
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground text-sm">
											No recent comments
										</p>
									)}
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Icon name="activity" className="h-5 w-5" />
										Recent Activity
									</CardTitle>
								</CardHeader>
								<CardContent>
									{recentActivity.activityLogs.length > 0 ? (
										<div className="space-y-3">
											{recentActivity.activityLogs.map((log) => (
												<div key={log.id} className="space-y-1">
													<p className="text-sm font-medium">{log.action}</p>
													<div className="text-muted-foreground flex items-center gap-2 text-xs">
														<span>On: {log.note.title}</span>
														<span>•</span>
														<span>
															{new Date(log.createdAt).toLocaleDateString()}
														</span>
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground text-sm">
											No recent activity
										</p>
									)}
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Icon name="file-text" className="h-5 w-5" />
									Recent Notes
								</CardTitle>
							</CardHeader>
							<CardContent>
								{user.notes.length > 0 ? (
									<div className="space-y-3">
										{user.notes.map((note) => (
											<div
												key={note.id}
												className="flex items-center justify-between"
											>
												<div>
													<p className="font-medium">{note.title}</p>
													<p className="text-muted-foreground text-xs">
														Created:{' '}
														{new Date(note.createdAt).toLocaleDateString()} •
														Updated:{' '}
														{new Date(note.updatedAt).toLocaleDateString()}
													</p>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										No notes created
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="security" className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<Card>
								<CardHeader>
									<CardTitle>Authentication Methods</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-sm">Password</span>
										<Badge variant={user.hasPassword ? 'default' : 'secondary'}>
											{user.hasPassword ? 'Set' : 'Not Set'}
										</Badge>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-sm">Passkeys</span>
										<Badge variant="secondary">0 configured</Badge>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Connected Accounts</CardTitle>
								</CardHeader>
								<CardContent>
									{user.connections.length > 0 ? (
										<div className="space-y-2">
											{user.connections.map((connection) => (
												<div
													key={connection.id}
													className="flex items-center justify-between"
												>
													<div className="flex items-center gap-2">
														<Badge variant="outline">
															{connection.providerName}
														</Badge>
														<span className="font-mono text-sm">
															{connection.providerId}
														</span>
													</div>
													<span className="text-muted-foreground text-xs">
														{new Date(
															connection.createdAt,
														).toLocaleDateString()}
													</span>
												</div>
											))}
										</div>
									) : (
										<p className="text-muted-foreground text-sm">
											No connected accounts
										</p>
									)}
								</CardContent>
							</Card>
						</div>

						<Card>
							<CardHeader>
								<CardTitle>Active Sessions</CardTitle>
								<CardDescription>Current active login sessions</CardDescription>
							</CardHeader>
							<CardContent>
								{activeSessions.length > 0 ? (
									<div className="space-y-2">
										{activeSessions.map((session) => (
											<div
												key={session.id}
												className="flex items-center justify-between rounded border p-3"
											>
												<div>
													<p className="text-sm font-medium">
														Session {session.id.slice(0, 8)}...
													</p>
													<p className="text-muted-foreground text-xs">
														Created:{' '}
														{new Date(session.createdAt).toLocaleString()}
													</p>
												</div>
												<div className="text-right">
													<p className="text-muted-foreground text-xs">
														Expires:{' '}
														{new Date(session.expirationDate).toLocaleString()}
													</p>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										No active sessions
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="ip-addresses" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>IP Addresses</CardTitle>
								<CardDescription>
									IP addresses used by this user
								</CardDescription>
							</CardHeader>
							<CardContent>
								{ipAddresses.length > 0 ? (
									<div className="space-y-2">
										{ipAddresses.map((conn) => (
											<div
												key={conn.id}
												className="flex items-center justify-between rounded border p-3"
											>
												<div>
													<p className="font-mono text-sm">
														{conn.ipAddress.ip}
													</p>
													<p className="text-muted-foreground text-xs">
														{conn.ipAddress.city}, {conn.ipAddress.region},{' '}
														{conn.ipAddress.country}
													</p>
												</div>
												<div className="text-right">
													<p className="text-muted-foreground text-xs">
														Last Seen:{' '}
														{new Date(conn.lastSeenAt).toLocaleString()}
													</p>
												</div>
											</div>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-sm">
										No IP addresses recorded for this user
									</p>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>

			<BanUserDialog
				user={user}
				isOpen={showBanDialog}
				onClose={() => setShowBanDialog(false)}
			/>
		</>
	)
}
