import { invariant } from '@epic-web/invariant'
import { Novu } from '@novu/api'
import { testWorkflow } from '@repo/notifications'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useRouteLoaderData,
} from 'react-router'
import { PageTitle } from '#app/components/ui/page-title.tsx'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { loader as rootLoader } from '#app/root.tsx'
import { NotesChart } from '#app/components/notes-chart'
import { OnboardingChecklist } from '#app/components/onboarding-checklist'
import {
	getOnboardingProgress,
	autoDetectCompletedSteps,
} from '#app/utils/onboarding'

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

	return Response.json({
		organization,
		chartData,
		daysToShow,
		onboardingProgress,
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

	invariant(organization, 'organization is required')

	//subscriber id = org id + customner id
	const subscriberId = `${organization.id}-${userId}`
	console.log(subscriberId)
	console.log('trigger initiated')

	try {
		console.log('testWorkflow.id', testWorkflow.id)
		await novu.trigger({
			workflowId: 'demo-verify-otp',
			to: {
				subscriberId: subscriberId,
				email: 'mohammed.zama.khan@gmail.com',
			},
			payload: {},
		})
	} catch (err) {
		console.error('Error triggering workflow', err)
	}

	return null
}

export default function OrganizationDashboard() {
	const { chartData, daysToShow, onboardingProgress } = useLoaderData() as {
		organization: { name: string }
		chartData: Array<{
			date: string
			day: string
			label: string
			notes: number
		}>
		daysToShow: number
		onboardingProgress: any
	}
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const user = rootData?.user
	const orgSlug =
		rootData?.userOrganizations?.currentOrganization?.organization.slug || ''

	return (
		<div className="p-8">
			<PageTitle
				title={`Welcome ${user?.name || 'User'}!`}
				description="Welcome to your organization dashboard. Here you can manage your organization's settings and view analytics."
			/>

			<div className="flex gap-8">
				{/* Onboarding Checklist */}
				{onboardingProgress &&
					!onboardingProgress.isCompleted &&
					onboardingProgress.isVisible && (
						<div className="mt-8 w-1/2">
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
					)}

				<div className="mt-8 w-1/2">
					<NotesChart data={chartData} daysShown={daysToShow} />
				</div>
			</div>
		</div>
	)
}
