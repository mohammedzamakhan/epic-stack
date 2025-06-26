import { redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server'
import { 
  getUserOrganizations, 
  setUserDefaultOrganization 
} from '#app/utils/organizations.server'

const SetDefaultOrganizationSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
})

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request)

  const formData = await request.formData()
  const result = SetDefaultOrganizationSchema.safeParse(
    Object.fromEntries(formData),
  )

  if (!result.success) {
    return Response.json({ errors: result.error.flatten() }, { status: 400 })
  }

  const { organizationId } = result.data

  // Check if the user has access to the organization
  const userOrganizations = await getUserOrganizations(userId)
  const hasAccess = userOrganizations.find(
    (userOrg) => userOrg.organization.id === organizationId,
  )

  if (!hasAccess) {
    return Response.json(
      { errors: { formErrors: ['You do not have access to this organization'] } },
      { status: 403 },
    )
  }

  // Set the organization as the default
  await setUserDefaultOrganization(userId, organizationId)

  // Redirect back to the previous page or a default location
  return redirect(`/app/${hasAccess.organization.slug}`)
}