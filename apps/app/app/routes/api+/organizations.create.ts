import { parseWithZod } from '@conform-to/zod'
import { prisma } from '@repo/database'
import { data } from 'react-router'
import { z } from 'zod'
import { invalidateUserOrganizationsCache } from '#app/utils/cache.server.ts'
import { requireAuth } from '#app/utils/jwt.server.ts'
import {
	createOrganization,
	setUserDefaultOrganization,
} from '#app/utils/organization/organizations.server.ts'
import { type Route } from './+types/organizations.create.ts'

const CreateOrganizationSchema = z.object({
	name: z.string().min(2, { message: 'Organization name is required' }),
	slug: z
		.string()
		.min(2, { message: 'Slug is required' })
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
			message: 'Slug can only contain lowercase letters, numbers, and hyphens',
		}),
	description: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	try {
		const payload = requireAuth(request)
		const userId = payload.sub

		const contentType = request.headers.get('content-type') ?? ''
		let formData: FormData

		if (contentType.includes('application/json')) {
			const json = (await request.json()) as Record<string, unknown>
			formData = new FormData()
			for (const [key, value] of Object.entries(json)) {
				if (value !== undefined && value !== null) {
					formData.append(key, String(value))
				}
			}
		} else {
			formData = await request.formData()
		}

		const submission = await parseWithZod(formData, {
			schema: CreateOrganizationSchema.superRefine(async ({ slug }, ctx) => {
				const existingOrg = await prisma.organization.findUnique({
					where: { slug },
					select: { id: true },
				})
				if (existingOrg) {
					ctx.addIssue({
						path: ['slug'],
						code: z.ZodIssueCode.custom,
						message: 'This slug is already taken',
					})
				}
			}),
			async: true,
		})

		if (submission.status !== 'success') {
			return data(
				{
					success: false,
					error: 'validation_error',
					message: 'Validation failed',
					errors: submission.reply(),
				},
				{ status: 400 },
			)
		}

		const { name, slug, description } = submission.value

		const organization = await createOrganization({
			name,
			slug,
			description,
			userId,
			request,
		})

		await setUserDefaultOrganization(userId, organization.id)
		await invalidateUserOrganizationsCache(userId)

		return data({
			success: true,
			data: {
				organization: {
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					description: description ?? null,
				},
			},
		})
	} catch (error) {
		if (error instanceof Error && error.message.includes('authorization')) {
			return data(
				{
					success: false,
					error: 'unauthorized',
					message: 'Authentication required',
				},
				{ status: 401 },
			)
		}

		console.error('Create organization API error:', error)
		return data(
			{
				success: false,
				error: 'internal_error',
				message: 'Failed to create organization',
			},
			{ status: 500 },
		)
	}
}

export async function loader() {
	return data(
		{
			success: false,
			error: 'method_not_allowed',
			message: 'Use POST method to create organization',
		},
		{ status: 405 },
	)
}
