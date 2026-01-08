import { invariant } from '@epic-web/invariant'

import { Trans, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Novu } from '@novu/api'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
} from '@repo/common/onboarding'
import { prisma } from '@repo/database'
import { PageTitle } from '@repo/ui/page-title'
import confetti from 'canvas-confetti'
import { useEffect, useRef } from 'react'
import {
	type ActionFunctionArgs,
	Form,
	type LoaderFunctionArgs,
	useLoaderData,
	useRouteLoaderData,
	useSearchParams,
	useNavigate,
} from 'react-router'
import { LeadershipCard } from '#app/components/leadership-card.tsx'
import { NotesChart } from '#app/components/notes-chart.tsx'
import { OnboardingChecklist } from '#app/components/onboarding-checklist.tsx'

import { type loader as rootLoader } from '#app/root.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { setUserDefaultOrganization } from '#app/utils/organization/organizations.server.ts'
// import { DataTable } from '#app/components/data-table.tsx'
// import data from '#app/dashboard/data.json'

const novu = new Novu({
	secretKey: process.env.NOVU_SECRET_KEY,
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug
	invariant(orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug, users: { some: { userId: userId } } },
		select: { id: true, name: true, createdAt: true },
	})

	if (!organization) {
		// Handle case where organization is not found or user is not a member
		throw new Response('Not Found', { status: 404 })
	}

	// Calculate appropriate date range - show since org creation or last 30 days, whichever is shorter
	const now = new Date()
	const thirtyDaysAgo = new Date()
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

	const startDate =
		organization.createdAt > thirtyDaysAgo
			? organization.createdAt
			: thirtyDaysAgo
	const daysSinceStart = Math.ceil(
		(now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
	)
	const daysToShow = Math.max(7, Math.min(30, daysSinceStart)) // Show at least 7 days, max 30

	// Run all independent queries in parallel for better performance
	const [notesData, onboardingProgress, leadershipData] = await Promise.all([
		// Notes data for chart
		prisma.organizationNote.findMany({
			where: {
				organizationId: organization.id,
				createdAt: { gte: startDate },
			},
			select: { createdAt: true },
			orderBy: { createdAt: 'asc' },
		}),
		// Onboarding progress (auto-detect + get progress)
		(async () => {
			await autoDetectCompletedSteps(userId, organization.id)
			return getOnboardingProgress(userId, organization.id)
		})(),
		// Leadership data - top note creators
		prisma.organizationNote.groupBy({
			by: ['createdById'],
			where: { organizationId: organization.id },
			_count: { id: true },
			orderBy: { _count: { id: 'desc' } },
			take: 6,
		}),
		// Set default organization (fire and forget, no await needed for result)
		setUserDefaultOrganization(userId, organization.id),
	])

	// Group notes by day
	const dailyNotes = notesData.reduce(
		(acc, note) => {
			const date = note.createdAt.toISOString().split('T')[0]
			if (date) {
				acc[date] = (acc[date] || 0) + 1
			}
			return acc
		},
		{} as Record<string, number>,
	)

	// Create array with all days in the range, filling missing days with 0
	const chartData = []
	for (let i = daysToShow - 1; i >= 0; i--) {
		const date = new Date()
		date.setDate(date.getDate() - i)
		const dateStr = date.toISOString().split('T')[0]
		const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
		const monthDay = date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		})

		chartData.push({
			date: dateStr,
			day: dayName,
			label: monthDay,
			notes: (dateStr && dailyNotes[dateStr]) || 0,
		})
	}

	// Get user details for the top contributors (depends on leadershipData)
	const userIds = leadershipData.map((item) => item.createdById)
	const users =
		userIds.length > 0
			? await prisma.user.findMany({
					where: { id: { in: userIds } },
					select: {
						id: true,
						name: true,
						email: true,
						image: { select: { objectKey: true } },
					},
				})
			: []

	// ⚡ Performance: Build a Map for O(1) lookups instead of O(n) .find() per item
	// This reduces time complexity from O(n×m) to O(n+m) when combining user data with rankings
	const userMap = new Map(users.map((u) => [u.id, u]))

	// Combine user data with note counts and add ranking
	const leaders = leadershipData.map((item, index) => {
		const user = userMap.get(item.createdById)
		return {
			id: item.createdById,
			name: user?.name || 'Unknown User',
			email: user?.email || '',
			notesCount: item._count?.id || 0,
			rank: index + 1,
			image: user?.image || null,
		}
	})

	return Response.json({
		organization,
		chartData,
		daysToShow,
		onboardingProgress,
		leaders,
	})
}

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug
	invariant(orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug, users: { some: { userId: userId } } },
		select: { id: true },
	})

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, email: true },
	})

	invariant(user, 'User is not found')

	invariant(organization, 'organization is required')

	//subscriber id = org id + customner id
	const subscriberId = `${organization.id}_${userId}`

	try {
		await novu.trigger({
			workflowId: 'test-workflow',
			to: {
				subscriberId: subscriberId,
				email: user.email,
			},
			payload: {},
		})
	} catch {
		// Error triggering workflow
	}

	return null
}

export default function OrganizationDashboard() {
	const { _ } = useLingui()
	const { chartData, daysToShow, onboardingProgress, leaders } =
		useLoaderData() as {
			organization: { name: string }
			chartData: Array<{
				date: string
				day: string
				label: string
				notes: number
			}>
			daysToShow: number
			onboardingProgress: any
			leaders: Array<{
				id: string
				name: string
				email: string
				notesCount: number
				rank: number
			}>
		}
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const user = rootData?.user
	const orgSlug =
		rootData?.userOrganizations?.currentOrganization?.organization.slug || ''

	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const celebrationStartedRef = useRef(false)

	// Trigger confetti animation when celebrate param is present
	useEffect(() => {
		const shouldCelebrate = searchParams.get('celebrate') === 'true'

		if (shouldCelebrate && !celebrationStartedRef.current) {
			celebrationStartedRef.current = true

			// Fire confetti from the top
			const duration = 3000
			const animationEnd = Date.now() + duration
			const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

			const interval = setInterval(() => {
				const timeLeft = animationEnd - Date.now()

				if (timeLeft <= 0) {
					clearInterval(interval)

					// Clean up query parameter after animation completes
					const newSearchParams = new URLSearchParams(searchParams)
					newSearchParams.delete('celebrate')
					void navigate(
						{
							search: newSearchParams.toString(),
						},
						{ replace: true },
					)
					celebrationStartedRef.current = false
					return
				}

				const particleCount = 50 * (timeLeft / duration)

				// Fire confetti from the top center
				void confetti({
					...defaults,
					particleCount,
					origin: { x: 0.5, y: 0 },
				})
			}, 250)

			return () => clearInterval(interval)
		}
	}, [searchParams, navigate])

	return (
		<div className="py-8 md:p-8">
			<PageTitle
				title={_(t`Welcome ${user?.name || 'User'}!`)}
				description={_(
					t`Welcome to your organization dashboard. Here you can manage your organization's settings and view analytics.`,
				)}
			/>

			<div className="flex flex-wrap gap-8 md:flex-nowrap">
				{/* Onboarding Checklist */}
				{onboardingProgress &&
				!onboardingProgress.isCompleted &&
				onboardingProgress.isVisible ? (
					<div className="mt-8 md:w-1/2">
						<OnboardingChecklist
							progress={onboardingProgress}
							orgSlug={orgSlug}
							organizationId={
								rootData?.userOrganizations?.currentOrganization?.organization
									.id || ''
							}
							variant="dashboard"
						/>
					</div>
				) : (
					<LeadershipCard className="order-2 mt-8 md:w-1/2" leaders={leaders} />
				)}

				<div className="mt-8 w-full lg:w-1/2">
					<NotesChart data={chartData} daysShown={daysToShow} />
					{onboardingProgress &&
						!onboardingProgress.isCompleted &&
						onboardingProgress.isVisible && (
							<LeadershipCard className="mt-4" leaders={leaders} />
						)}
				</div>
			</div>
			{/* <div className="mt-16">
				<DataTable data={data} />
			</div> */}
		</div>
	)
}
