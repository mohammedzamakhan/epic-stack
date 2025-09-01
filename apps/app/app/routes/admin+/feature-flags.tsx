import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { prisma } from '#app/utils/db.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const flags = await prisma.configFlag.findMany()
  return { flags }
}

const schema = z.object({
  key: z.string(),
  value: z.string(),
  level: z.enum(['system', 'organization', 'user']),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  type: z.string(),
  id: z.string().optional(),
}).refine(data => {
  if (data.level === 'organization') {
    return !!data.organizationId
  }
  return true
}, {
  message: 'Organization ID is required for organization level flags',
  path: ['organizationId'],
}).refine(data => {
  if (data.level === 'user') {
    return !!data.userId
  }
  return true
}, {
  message: 'User ID is required for user level flags',
  path: ['userId'],
})

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const { _action, ...values } = Object.fromEntries(formData)

  const result = schema.safeParse(values)
  if (!result.success) {
    return Response.json({ errors: result.error.flatten().fieldErrors }, { status: 400 })
  }

  let value: any
  switch (result.data.type) {
    case 'number':
      value = Number(result.data.value)
      break
    case 'boolean':
      value = result.data.value === 'on'
      break
    case 'date':
      value = new Date(result.data.value as string)
      break
    default:
      value = result.data.value as string
  }

  if (_action === 'create') {
    await prisma.configFlag.create({
      data: {
        key: values.key as string,
        value: value,
        level: values.level as any,
        organizationId: values.organizationId as string | undefined,
        userId: values.userId as string | undefined,
      },
    })
  }

  if (_action === 'update') {
    if (!result.data.id) {
      return Response.json({ errors: { id: ['ID is required for update'] } }, { status: 400 })
    }
    await prisma.configFlag.update({
      where: { id: result.data.id },
      data: {
        key: result.data.key,
        value: value,
        level: result.data.level,
        organizationId: result.data.organizationId,
        userId: result.data.userId,
      },
    })
  }

  if (_action === 'delete') {
    if (!result.data.id) {
      return Response.json({ errors: { id: ['ID is required for delete'] } }, { status: 400 })
    }
    await prisma.configFlag.delete({
      where: { id: result.data.id },
    })
  }

  return Response.json({ ok: true })
}

import { FeatureFlags } from '#app/components/admin/feature-flags'

export default function FeatureFlagsAdmin() {
  return <FeatureFlags />
}
