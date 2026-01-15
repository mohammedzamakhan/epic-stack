import { Trans } from '@lingui/macro'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@repo/ui/dialog'
import { Icon } from '@repo/ui/icon'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemHeader,
	ItemMedia,
	ItemTitle,
} from '@repo/ui/item'
import { StatusButton } from '@repo/ui/status-button'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'
import { useFetcher, useRevalidator } from 'react-router'
import {
	revokeSessionActionIntent,
	signOutOfSessionsActionIntent,
} from '#app/routes/_app+/security.tsx'
import { useDoubleCheck } from '#app/utils/misc.tsx'

interface DeviceInfo {
	browserName: string
	browserVersion?: string
	osName: string
	osVersion?: string
	deviceType: 'mobile' | 'tablet' | 'desktop'
	deviceName: string
	operatingSystem: string
}

interface Session {
	id: string
	createdAt: Date
	expirationDate: Date
	updatedAt: Date
	ipAddress: string | null
	userAgent: string | null
	deviceInfo: DeviceInfo | null
}

interface SessionsCardProps {
	sessions: Session[]
	currentSessionId: string | null
}

export function SessionsCard({
	sessions,
	currentSessionId,
}: SessionsCardProps) {
	if (sessions.length === 0) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>
						<Trans>Sessions</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>Manage your active sessions</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						<Trans>No active sessions</Trans>
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>
					<Trans>Sessions</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Manage your active sessions. You're signed in on {sessions.length}{' '}
						{sessions.length === 1 ? 'device' : 'devices'}
					</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{sessions.map((session) => (
						<SessionItem
							key={session.id}
							session={session}
							isCurrentSession={session.id === currentSessionId}
						/>
					))}
				</div>
				{sessions.length > 1 && <SignOutAllDevices />}
			</CardContent>
		</Card>
	)
}

interface SessionItemProps {
	session: Session
	isCurrentSession: boolean
}

function getDeviceIcon(deviceType?: 'mobile' | 'tablet' | 'desktop') {
	switch (deviceType) {
		case 'mobile':
			return 'smartphone'
		case 'tablet':
			return 'tablet'
		case 'desktop':
			return 'monitor'
		default:
			return 'monitor'
	}
}

function SessionItem({ session, isCurrentSession }: SessionItemProps) {
	const [isModalOpen, setIsModalOpen] = useState(false)
	const fetcher = useFetcher()
	const revalidator = useRevalidator()
	const dc = useDoubleCheck()

	const isActive = new Date(session.expirationDate) > new Date()
	const timeAgo = formatDistanceToNow(session.createdAt, { addSuffix: true })
	const lastActive = formatDistanceToNow(session.updatedAt, { addSuffix: true })
	const deviceInfo = session.deviceInfo
	const deviceIcon = getDeviceIcon(deviceInfo?.deviceType)

	// Close modal and revalidate after successful revocation
	useEffect(() => {
		if (fetcher.data?.status === 'success' && !isCurrentSession) {
			setIsModalOpen(false)
			void revalidator.revalidate()
		}
	}, [fetcher.data?.status, isCurrentSession, revalidator])

	return (
		<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
			<DialogTrigger
				render={
					<Item
						variant="outline"
						size="sm"
						render={
							<button
								type="button"
								className="flex w-full items-center text-left"
							/>
						}
					>
						<ItemMedia variant="icon">
							<Icon name={deviceIcon} className="h-5 w-5" />
						</ItemMedia>
						<ItemContent className="min-w-0">
							<ItemHeader>
								<ItemTitle>
									{deviceInfo ? (
										deviceInfo.deviceName
									) : isCurrentSession ? (
										<Trans>This device</Trans>
									) : (
										<Trans>Device</Trans>
									)}
									<div className="flex items-center gap-2">
										{isCurrentSession && (
											<Badge variant="default" className="text-xs">
												<Trans>Current</Trans>
											</Badge>
										)}
										{!isActive && (
											<Badge variant="outline" className="text-xs">
												<Trans>Expired</Trans>
											</Badge>
										)}
									</div>
								</ItemTitle>
							</ItemHeader>
							<ItemDescription>
								{session.ipAddress ? (
									<>
										{session.ipAddress}
										{lastActive && (
											<>
												{' • '}
												<Trans>Last active {lastActive}</Trans>
											</>
										)}
									</>
								) : (
									<Trans>Last active {lastActive}</Trans>
								)}
							</ItemDescription>
						</ItemContent>
						<ItemActions>
							<Icon
								name="chevron-right"
								className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover/item:opacity-100 rtl:rotate-180"
							/>
						</ItemActions>
					</Item>
				}
			/>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>
						<Trans>Session Details</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>View and manage this session</Trans>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								<Trans>Status</Trans>
							</span>
							<div className="flex items-center gap-2">
								{isCurrentSession && (
									<span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
										<Trans>Current</Trans>
									</span>
								)}
								{isActive ? (
									<span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
										<Trans>Active</Trans>
									</span>
								) : (
									<span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
										<Trans>Expired</Trans>
									</span>
								)}
							</div>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								<Trans>Signed in</Trans>
							</span>
							<span className="text-sm font-medium">{timeAgo}</span>
						</div>
						{deviceInfo && (
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground text-sm">
									<Trans>Device</Trans>
								</span>
								<span className="text-sm font-medium">
									{deviceInfo.deviceName}
								</span>
							</div>
						)}
						{deviceInfo && (
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground text-sm">
									<Trans>Operating System</Trans>
								</span>
								<span className="text-sm font-medium">
									{deviceInfo.operatingSystem}
								</span>
							</div>
						)}
						{session.ipAddress && (
							<div className="flex items-center justify-between">
								<span className="text-muted-foreground text-sm">
									<Trans>IP Address</Trans>
								</span>
								<span className="font-mono text-sm font-medium">
									{session.ipAddress}
								</span>
							</div>
						)}
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								<Trans>Last active</Trans>
							</span>
							<span className="text-sm font-medium">{lastActive}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								<Trans>Expires</Trans>
							</span>
							<span className="text-sm font-medium">
								{formatDistanceToNow(session.expirationDate, {
									addSuffix: true,
								})}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground text-sm">
								<Trans>Session ID</Trans>
							</span>
							<span className="text-muted-foreground font-mono text-xs">
								{session.id.slice(0, 8)}...
							</span>
						</div>
					</div>
					{!isCurrentSession && isActive && (
						<div className="pt-2">
							<fetcher.Form method="POST">
								<input type="hidden" name="sessionId" value={session.id} />
								<StatusButton
									{...dc.getButtonProps({
										type: 'submit',
										name: 'intent',
										value: revokeSessionActionIntent,
										className: 'w-full',
									})}
									variant={dc.doubleCheck ? 'destructive' : 'outline'}
									status={
										fetcher.state !== 'idle'
											? 'pending'
											: (fetcher.data?.status ?? 'idle')
									}
								>
									{dc.doubleCheck ? (
										<Trans>Are you sure?</Trans>
									) : (
										<Trans>Revoke session</Trans>
									)}
								</StatusButton>
							</fetcher.Form>
						</div>
					)}
					{isCurrentSession && (
						<p className="text-muted-foreground text-sm">
							<Trans>This is your current session. Sign out to end it.</Trans>
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function SignOutAllDevices() {
	const fetcher = useFetcher()
	const revalidator = useRevalidator()

	useEffect(() => {
		if (fetcher.data?.status === 'success') {
			void revalidator.revalidate()
		}
	}, [fetcher.data?.status, revalidator])

	return (
		<div className="mt-4 border-t pt-4">
			<Item variant="outline">
				<ItemContent>
					<ItemTitle>
						<Trans>Sign out of all other devices</Trans>
					</ItemTitle>
					<ItemDescription>
						<Trans>Remove access from all devices except this one</Trans>
					</ItemDescription>
				</ItemContent>
				<ItemActions>
					<fetcher.Form method="POST">
						<Button
							type="submit"
							name="intent"
							value={signOutOfSessionsActionIntent}
							variant="outline"
							disabled={fetcher.state !== 'idle'}
						>
							{fetcher.state !== 'idle' ? (
								<Trans>Signing out...</Trans>
							) : (
								<Trans>Sign out</Trans>
							)}
						</Button>
					</fetcher.Form>
				</ItemActions>
			</Item>
		</div>
	)
}
