import { invariant } from '@epic-web/invariant'
import { Novu } from '@novu/api'
import { testWorkflow, commentMentionWorkflow, noteCommentWorkflow } from '@repo/notifications'
import {
	type ActionFunctionArgs,
	Form,
	type LoaderFunctionArgs,
	useLoaderData,
	useRouteLoaderData,
} from 'react-router'
import { PageTitle } from '@repo/ui'
import { LeadershipCard } from '#app/components/leadership-card.tsx'
import { NotesChart } from '#app/components/notes-chart'
import { OnboardingChecklist } from '#app/components/onboarding-checklist'

import { type loader as rootLoader } from '#app/root.tsx'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
} from '#app/utils/onboarding'
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

	const notesData = await prisma.organizationNote.findMany({
		where: {
			organizationId: organization.id,
			createdAt: {
				gte: startDate,
			},
		},
		select: {
			createdAt: true,
		},
		orderBy: {
			createdAt: 'asc',
		},
	})

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

	// Get onboarding progress
	await autoDetectCompletedSteps(userId, organization.id)
	const onboardingProgress = await getOnboardingProgress(
		userId,
		organization.id,
	)

	// Get leadership data - top note creators
	const leadershipData = await prisma.organizationNote.groupBy({
		by: ['createdById'],
		where: {
			organizationId: organization.id,
		},
		_count: {
			id: true,
		},
		orderBy: {
			_count: {
				id: 'desc',
			},
		},
		take: 6, // Top 6 contributors
	})

	// Get user details for the top contributors
	const userIds = leadershipData.map((item) => item.createdById)
	const users = await prisma.user.findMany({
		where: {
			id: {
				in: userIds,
			},
		},
		select: {
			id: true,
			name: true,
			email: true,
			image: { select: { objectKey: true } },
		},
	})

	// Combine user data with note counts and add ranking
	const leaders = leadershipData.map((item, index) => {
		const user = users.find((u) => u.id === item.createdById)
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

	const user = await prisma.user.findFirst({
		where: { id: userId },
		select: { id: true, email: true },
	})

	invariant(user, 'User is not found');

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
		console.log('Workflow triggered successfully')
	} catch (err) {
		console.error('Error triggering workflow', err)
	}

	return null
}

export default function OrganizationDashboard() {
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

	return (
		<div className="py-8 md:p-8">
			<PageTitle
				title={`Welcome ${user?.name || 'User'}!`}
				description="Welcome to your organization dashboard. Here you can manage your organization's settings and view analytics."
			/>

			<Form method="post">
			<button type="submit">Submit</button>
			</Form>

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

				<div className="mt-8 lg:w-1/2 w-full">
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
