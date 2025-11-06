import * as React from 'react'
import { getPageTitle } from '@repo/config/brand'
import { redirect } from 'react-router'
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
	CardFooter,
	CardHeader,
	CardTitle,
	Icon,
	Field,
	FieldContent,
	InputGroup,
	InputGroupInput,
	InputGroupAddon,
	InputGroupButton,
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
			// Fallback for browsers that don't support clipboard API
			const textArea = document.createElement('textarea')
			textArea.value = referralUrl
			document.body.appendChild(textArea)
			textArea.select()
			try {
				document.execCommand('copy')
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			} catch (fallbackErr) {
				console.error('Fallback copy failed:', fallbackErr)
			}
			document.body.removeChild(textArea)
		}
	}

	return (
		<Card className="mx-auto w-full max-w-md bg-white/95 backdrop-blur">
			<CardHeader className="text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
					<Icon name="check" className="h-8 w-8 text-green-600" />
				</div>
				<CardTitle className="justify-center text-2xl font-bold">
					You're on the Waitlist!
				</CardTitle>
				<CardDescription className="text-base">
					We'll notify you by email as soon as the waitlist opens.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Points and Rank Display */}
				<div>
					<p className="mb-1 text-center font-medium">
						Want to go to the top of the waitlist?
					</p>
					<p className="text-muted-foreground mb-4 text-center text-sm">
						Here's how to do it:
					</p>
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<p className="text-muted-foreground mb-1 text-xs">Your points</p>
							<p className="text-3xl font-bold">{waitlistEntry.points}</p>
						</div>
						<div className="text-center">
							<p className="text-muted-foreground mb-1 text-xs">Your rank</p>
							<p className="text-3xl font-bold">#{rank}</p>
							<p className="text-muted-foreground text-xs">
								of {totalUsers} people
							</p>
						</div>
					</div>
				</div>

				{/* Referral Section */}
				<div className="space-y-3">
					<div className="flex items-start gap-3">
						<div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
							<Icon name="users" className="text-primary h-4 w-4" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="my-2 flex items-baseline justify-between gap-2">
								<p className="text-sm font-medium">Share with others</p>
								<span className="text-xs font-semibold text-green-600">
									+5 points/referral
								</span>
							</div>
							<Field>
								<FieldContent>
									<InputGroup>
										<InputGroupInput
											type="text"
											value={referralUrl}
											readOnly
											aria-label="Your referral link"
										/>
										<InputGroupAddon align="inline-end">
											<InputGroupButton
												onClick={copyToClipboard}
												variant="ghost"
												size="xs"
											>
												<Icon name={copied ? 'check' : 'copy'} />
												{copied ? 'Copied!' : 'Copy'}
											</InputGroupButton>
										</InputGroupAddon>
									</InputGroup>
								</FieldContent>
							</Field>
							{waitlistEntry.referralCount > 0 && (
								<p className="mt-2 text-xs text-green-600">
									{waitlistEntry.referralCount}{' '}
									{waitlistEntry.referralCount === 1 ? 'person' : 'people'}{' '}
									joined using your link! Thanks for referring.
								</p>
							)}
						</div>
					</div>

					{/* Discord Section */}
					<div className="flex items-start gap-3">
						<div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
							<Icon name="message-circle" className="text-primary h-4 w-4" />
						</div>
						<div className="flex-1">
							<div className="my-2 flex items-baseline justify-between gap-2">
								<p className="text-sm font-medium">Join our Discord</p>
								<span className="text-xs font-semibold text-green-600">
									+2 points
								</span>
							</div>
							{waitlistEntry.hasJoinedDiscord ? (
								<p className="text-xs font-medium text-green-600">
									✓ Discord points claimed
								</p>
							) : (
								<div className="flex flex-col gap-2">
									{discordInviteUrl && (
										<a
											href={discordInviteUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="rounded-md bg-[#5865F2] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#4752C4]"
										>
											Join Discord server
										</a>
									)}
									{hasDiscordOAuth ? (
										<>
											<a
												href="/auth/discord/verify"
												className="rounded-md border border-[#5865F2] px-4 py-2 text-center text-sm font-medium text-[#5865F2] transition-colors hover:bg-[#5865F2]/10"
											>
												Verify Discord membership
											</a>
											<p className="text-muted-foreground text-xs">
												Click "Verify Discord membership" after joining to claim
												your points automatically.
											</p>
										</>
									) : (
										<p className="text-muted-foreground text-xs">
											Note: Discord verification is currently manual. Contact
											support after joining to claim your points.
										</p>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</CardContent>
			{/* Email Notification Info */}
			<CardFooter>
				<p className="text-muted-foreground text-sm">
					We'll send you an email at{' '}
					<span className="font-semibold">{user.email}</span> when we're ready
					to welcome you.
				</p>
			</CardFooter>
		</Card>
	)
}
