import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import type { ActionFunction } from 'react-router'

export const action: ActionFunction = async ({ request, params }) => {
	const orgSlug = params.orgSlug;
	if (!orgSlug) return new Response('Missing orgSlug', { status: 400 });
	const organization = await prisma.organization.findFirst({ select:{id:true}, where:{slug:orgSlug} });
	if (!organization) return new Response('Organization not found', { status:404 });
	await userHasOrgAccess(request, organization.id);

	const formData = await request.formData();
	const noteId = formData.get('noteId')?.toString();
	const positionStr = formData.get('position')?.toString();
	const statusId = formData.get('statusId')?.toString() ?? null;
	if (!noteId || !positionStr) return new Response('Missing fields', { status:400 });
	const position = Number(positionStr);

	// Validate statusId (if provided)
	if (statusId) {
		const statusRow = await prisma.organizationNoteStatus.findFirst({
			where: { id: statusId, organizationId: organization.id }
		});
		if (!statusRow) return new Response('Invalid statusId', { status: 400 });
	}

	const updated = await prisma.organizationNote.updateMany({
		where: {
			id: noteId,
			organizationId: organization.id,
		},
		data: {
			statusId,
			position,
		},
	});

	if (updated.count === 0) {
		return new Response('Note not found or not in org', { status: 404 });
	}

	return new Response(null, { status: 204 });
}