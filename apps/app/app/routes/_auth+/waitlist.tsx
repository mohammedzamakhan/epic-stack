import * as React from 'react'
import { getPageTitle } from '@repo/config/brand'
import { redirect, data, Form } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getLaunchStatus, getDiscordInviteUrl } from '#app/utils/env.server.ts'
import {
	getOrCreateWaitlistEntry,
	calculateUserRank,
} from '#app/utils/waitlist.server.ts'
import { type Route } from './+types/waitlist.ts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Icon,
} from '@repo/ui'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true, name: true },
	})

	if (!user) {
		throw redirect('/login')
	}

	// If launch status is not CLOSED_BETA, redirect to organizations
	const launchStatus = getLaunchStatus()
	if (launchStatus !== 'CLOSED_BETA') {
		throw redirect('/organizations')
	}

	// Get or create waitlist entry
	const waitlistEntry = await getOrCreateWaitlistEntry(userId)

	// Calculate rank
	const { rank, totalUsers } = await calculateUserRank(userId)

	// Get the base URL for referral links
	const url = new URL(request.url)
	const baseUrl = `${url.protocol}//${url.host}`
	const referralUrl = `${baseUrl}/r/${waitlistEntry.referralCode}`

	// Get Discord configuration
	const discordInviteUrl = getDiscordInviteUrl()
	const hasDiscordOAuth =
		!!process.env.DISCORD_CLIENT_ID &&
		!!process.env.DISCORD_CLIENT_SECRET &&
		!!process.env.DISCORD_GUILD_ID

	return {
		user,
		waitlistEntry: {
			points: waitlistEntry.points,
			referralCode: waitlistEntry.referralCode,
			hasJoinedDiscord: waitlistEntry.hasJoinedDiscord,
			referralCount: waitlistEntry.referrals.length,
		},
		rank,
		totalUsers,
		referralUrl,
		discordInviteUrl,
		hasDiscordOAuth,
	}
}

export function meta() {
	return [{ title: getPageTitle('You are on the Waitlist') }]
}

export default function WaitlistPage({ loaderData }: Route.ComponentProps) {
	const {
		user,
		waitlistEntry,
		rank,
		totalUsers,
		referralUrl,
		discordInviteUrl,
		hasDiscordOAuth,
	} = loaderData
	const [copied, setCopied] = React.useState(false)

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(referralUrl)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy:', err)
		}
	}

	return (
		<Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<Icon name="check" className="h-8 w-8 text-green-600" />
				</div>
				<CardTitle className="text-2xl font-bold">
					You're on the Waitlist!
				</CardTitle>
				<CardDescription className="text-base">
					We'll notify you by email as soon as the waitlist opens.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Points and Rank Display */}
				<div className="rounded-lg bg-muted p-4">
					<p className="text-sm font-medium text-center mb-4">
						Want to go to the top of the waitlist? Here's how to do it:
					</p>
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<p className="text-xs text-muted-foreground mb-1">Your points</p>
							<p className="text-3xl font-bold">{waitlistEntry.points}</p>
						</div>
						<div className="text-center">
							<p className="text-xs text-muted-foreground mb-1">Your rank</p>
							<p className="text-3xl font-bold">
								{rank} / {totalUsers}
							</p>
						</div>
					</div>
				</div>

				{/* Referral Section */}
				<div className="space-y-3">
					<div className="flex items-start gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-1">
							<Icon name="users" className="h-4 w-4 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-baseline gap-2 mb-2">
								<p className="text-sm font-medium">Share with others</p>
								<span className="text-xs text-green-600 font-semibold">
									+5 points/referral
								</span>
							</div>
							<div className="flex gap-2">
								<input
									type="text"
									value={referralUrl}
									readOnly
									aria-label="Your referral link"
									className="flex-1 min-w-0 px-3 py-2 text-sm border rounded-md bg-background"
								/>
								<button
									onClick={copyToClipboard}
									className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors shrink-0"
								>
									{copied ? 'Copied!' : 'Copy'}
								</button>
							</div>
							{waitlistEntry.referralCount > 0 && (
								<p className="text-xs text-muted-foreground mt-2">
									{waitlistEntry.referralCount}{' '}
									{waitlistEntry.referralCount === 1 ? 'person' : 'people'}{' '}
									joined using your link
								</p>
							)}
						</div>
					</div>

					{/* Discord Section */}
					<div className="flex items-start gap-3">
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-1">
							<Icon name="message-circle" className="h-4 w-4 text-primary" />
						</div>
						<div className="flex-1">
							<div className="flex items-baseline gap-2 mb-2">
								<p className="text-sm font-medium">Join our Discord</p>
								<span className="text-xs text-green-600 font-semibold">
									+2 points
								</span>
							</div>
							{waitlistEntry.hasJoinedDiscord ? (
								<p className="text-xs text-green-600 font-medium">
									✓ Discord points claimed
								</p>
							) : (
								<div className="flex flex-col gap-2">
									{discordInviteUrl && (
										<a
											href={discordInviteUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="px-4 py-2 text-sm font-medium text-center text-white bg-[#5865F2] rounded-md hover:bg-[#4752C4] transition-colors"
										>
											Join Discord server
										</a>
									)}
									{hasDiscordOAuth ? (
										<>
											<a
												href="/auth/discord/verify"
												className="px-4 py-2 text-sm font-medium text-center border border-[#5865F2] text-[#5865F2] rounded-md hover:bg-[#5865F2]/10 transition-colors"
											>
												Verify Discord membership
											</a>
											<p className="text-xs text-muted-foreground">
												Click "Verify Discord membership" after joining to claim
												your points automatically.
											</p>
										</>
									) : (
										<p className="text-xs text-muted-foreground">
											Note: Discord verification is currently manual. Contact
											support after joining to claim your points.
										</p>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Email Notification Info */}
				<div className="pt-4 border-t">
					<p className="text-sm text-muted-foreground text-center">
						We'll send you an email at{' '}
						<span className="font-semibold">{user.email}</span> when we're ready
						to welcome you.
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
