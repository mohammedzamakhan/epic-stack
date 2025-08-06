import { prisma } from '#app/utils/db.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { userHasOrgAccess } from '#app/utils/organizations.server.ts'
import type { ActionFunction } from 'react-router'

export const action: ActionFunction = async ({ request, params }) => {
  if (request.method !== 'PATCH') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const orgSlug = params.orgSlug
  const statusId = params.statusId
  if (!orgSlug || !statusId) return new Response('Missing params', { status: 400 })
  const organization = await prisma.organization.findFirst({
    select: { id: true },
    where: { slug: orgSlug },
  })
  if (!organization) return new Response('Organization not found', { status: 404 })
  await userHasOrgAccess(request, organization.id)

  const formData = await request.formData()
  const name = formData.get('name')?.toString().trim()
  if (!name) return new Response('Missing name', { status: 400 })

  // Check for duplicate name
  const existing = await prisma.organizationNoteStatus.findFirst({
    where: { organizationId: organization.id, name, id: { not: statusId } },
  })
  if (existing) return new Response('Name already exists', { status: 409 })

  const updated = await prisma.organizationNoteStatus.update({
    where: { id: statusId, organizationId: organization.id },
    data: { name },
    select: { id: true, name: true, position: true },
  })

  return Response.json(updated)
}