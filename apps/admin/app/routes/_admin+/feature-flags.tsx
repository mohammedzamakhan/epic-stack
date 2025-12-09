import { prisma } from '@repo/database'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { FeatureFlags } from '#app/components/admin/feature-flags.tsx'

export async function loader({ request: _request }: LoaderFunctionArgs) {
	const flags = await prisma.configFlag.findMany()
	return { flags }
}

const createUpdateSchema = z
	.object({
		key: z.string(),
		value: z.string(),
		level: z.enum(['system', 'organization', 'user']),
		organizationId: z.string().optional(),
		userId: z.string().optional(),
		type: z.string(),
		id: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.level === 'organization') {
				return !!data.organizationId
			}
			return true
		},
		{
			message: 'Organization ID is required for organization level flags',
			path: ['organizationId'],
		},
	)
	.refine(
		(data) => {
			if (data.level === 'user') {
				return !!data.userId
			}
			return true
		},
		{
			message: 'User ID is required for user level flags',
			path: ['userId'],
		},
	)

const deleteSchema = z.object({
	id: z.string().min(1, 'ID is required for delete'),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const _action = formData.get('_action')

	if (_action === 'delete') {
		const result = deleteSchema.safeParse({ id: formData.get('id') })
		if (!result.success) {
			return Response.json(
				{ errors: result.error.flatten().fieldErrors },
				{ status: 400 },
			)
		}
		await prisma.configFlag.delete({
			where: { id: result.data.id },
		})
		return Response.json({ ok: true })
	}

	const values = Object.fromEntries(formData)
	const result = createUpdateSchema.safeParse(values)
	if (!result.success) {
		return Response.json(
			{ errors: result.error.flatten().fieldErrors },
			{ status: 400 },
		)
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

	try {
		if (_action === 'create') {
			const existing = await prisma.configFlag.findFirst({
				where: {
					key: result.data.key,
					level: result.data.level,
					organizationId: result.data.organizationId ?? null,
					userId: result.data.userId ?? null,
				},
			})
			if (existing) {
				return Response.json(
					{ error: 'A flag with this key already exists at this level' },
					{ status: 400 },
				)
			}
			await prisma.configFlag.create({
				data: {
					key: result.data.key,
					value: value,
					level: result.data.level,
					organizationId: result.data.organizationId || undefined,
					userId: result.data.userId || undefined,
				},
			})
		}

		if (_action === 'update') {
			if (!result.data.id) {
				return Response.json(
					{ errors: { id: ['ID is required for update'] } },
					{ status: 400 },
				)
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

		return Response.json({ ok: true })
	} catch (error: any) {
		if (error?.code === 'P2002') {
			return Response.json(
				{ error: 'A flag with this key already exists at this level' },
				{ status: 400 },
			)
		}
		throw error
	}
}

export default function FeatureFlagsAdmin() {
	return <FeatureFlags />
}
