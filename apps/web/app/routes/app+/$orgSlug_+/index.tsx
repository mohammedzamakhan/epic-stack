import { invariant } from '@epic-web/invariant'
import { Novu } from '@novu/api'
import { testWorkflow } from '@repo/notifications'
import {
	type ActionFunctionArgs,
	Form,
	type LoaderFunctionArgs,
	useLoaderData,
	useRouteLoaderData,
} from 'react-router'
import { PageTitle } from '#app/components/ui/page-title.tsx'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { loader as rootLoader } from '#app/root.tsx'

const novu = new Novu({
	secretKey: process.env.NOVU_SECRET_KEY,
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug
	invariant(orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug, users: { some: { userId: userId } } },
		select: { name: true },
	})

	if (!organization) {
		// Handle case where organization is not found or user is not a member
		throw new Response('Not Found', { status: 404 })
	}

	return Response.json({ organization })
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
	const { organization } = useLoaderData() as { organization: { name: string } }
	const { user } = useRouteLoaderData<typeof rootLoader>('root');


	return (
		<div className="p-8">
			<PageTitle
				title={`Welcome ${user.name}!`}
				description="Welcome to your organization dashboard. Here you can manage your organization's settings and view analytics."
			/>

			{/* <Form method="POST">
				<button type="submit"> trigger </button>
			</Form> */}
		</div>
	)
}
