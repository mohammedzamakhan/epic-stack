import { invariant } from '@epic-web/invariant';
import { type LoaderFunctionArgs, useLoaderData } from 'react-router';
import { requireUserId } from '#app/utils/auth.server';
import { prisma } from '#app/utils/db.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const orgSlug = params.orgSlug;
	invariant(orgSlug, 'orgSlug is required');

	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug, users: { some: { userId: userId } } },
		select: { name: true },
	});

	if (!organization) {
		// Handle case where organization is not found or user is not a member
		throw new Response('Not Found', { status: 404 });
	}

	return Response.json({ organization });
}

export default function OrganizationDashboard() {
	const { organization } = useLoaderData() as { organization: { name: string } };

	return (
		<div>
			<h1>{organization.name} Dashboard</h1>
		</div>
	);
}
