import { parseWithZod } from '@conform-to/zod'
import { invariant } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useLoaderData,
	useActionData,
} from 'react-router'
import { z } from 'zod'

import { GeneralSettingsCard } from '#app/components/settings/cards/organization/general-settings-card'
import {
	uploadOrgPhotoActionIntent,
	deleteOrgPhotoActionIntent,
} from '#app/components/settings/cards/organization/organization-photo-card'
import {
	AnnotatedLayout,
	AnnotatedSection,
} from '#app/components/ui/annotated-layout'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { uploadOrganizationImage } from '#app/utils/storage.server.ts'
import { redirectWithToast } from '#app/utils/toast.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: {
			id: true,
			name: true,
			slug: true,
			image: {
				select: {
					id: true,
					objectKey: true,
					altText: true,
				},
			},
		},
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	return { organization }
}

const SettingsSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	slug: z.string().min(1, 'Slug is required'),
})

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	invariant(params.orgSlug, 'orgSlug is required')

	const organization = await prisma.organization.findFirst({
		where: {
			slug: params.orgSlug,
			users: {
				some: {
					userId,
				},
			},
		},
		select: { id: true, name: true, slug: true },
	})

	if (!organization) {
		throw new Response('Not Found', { status: 404 })
	}

	// Handle file uploads for organization logo
	const contentType = request.headers.get('content-type')
	if (contentType?.includes('multipart/form-data')) {
		const formData = await parseFormData(request, {
			maxFileSize: 1024 * 1024 * 3,
		})
		const intent = formData.get('intent')

		if (intent === uploadOrgPhotoActionIntent) {
			const photoFile = formData.get('photoFile') as File
			if (!photoFile || !(photoFile instanceof File) || !photoFile.size) {
				return Response.json(
					{ error: 'A valid image file is required.' },
					{ status: 400 },
				)
			}

			try {
				const objectKey = await uploadOrganizationImage(userId, photoFile)

				await prisma.$transaction(async ($prisma) => {
					await $prisma.organizationImage.deleteMany({
						where: { organizationId: organization.id },
					})
					await $prisma.organization.update({
						where: { id: organization.id },
						data: { image: { create: { objectKey } } },
					})
				})

				return Response.json({ status: 'success' })
			} catch (error) {
				console.error('Error uploading organization logo:', error)
				return Response.json(
					{ error: 'Failed to upload organization logo' },
					{ status: 500 },
				)
			}
		}

		if (intent === deleteOrgPhotoActionIntent) {
			try {
				await prisma.organizationImage.delete({
					where: { organizationId: organization.id },
				})

				return Response.json({ status: 'success' })
			} catch (error) {
				console.error('Error deleting organization logo:', error)
				return Response.json(
					{ error: 'Failed to delete organization logo' },
					{ status: 500 },
				)
			}
		}
	}

	// For non-multipart requests
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'update-settings') {
		const submission = parseWithZod(formData, {
			schema: SettingsSchema,
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const { name, slug } = submission.value

		try {
			await prisma.organization.update({
				where: { id: organization.id },
				data: { name, slug },
			})

			return redirectWithToast(`/app/${slug}/settings`, {
				title: 'Organization updated',
				description: "Your organization's settings have been updated.",
				type: 'success',
			})
		} catch (error) {
			console.error('Error updating organization:', error)
			return Response.json({
				result: submission.reply({
					formErrors: [
						'Failed to update organization settings. Please try again.',
					],
				}),
			})
		}
	}

	return Response.json({ error: `Invalid intent: ${intent}` }, { status: 400 })
}

export default function GeneralSettings() {
	const { organization } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	return (
		<AnnotatedLayout>
			<AnnotatedSection
				title="General Settings"
				description="Manage your organization's name, slug, and profile image."
			>
				<GeneralSettingsCard organization={organization} />
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
