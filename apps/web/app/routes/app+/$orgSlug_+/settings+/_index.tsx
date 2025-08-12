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

import DangerZoneCard from '#app/components/settings/cards/organization/danger-zone-card'
import { GeneralSettingsCard } from '#app/components/settings/cards/organization/general-settings-card'
import {
	uploadOrgPhotoActionIntent,
	deleteOrgPhotoActionIntent,
} from '#app/components/settings/cards/organization/organization-photo-card'
import {
	S3StorageCard,
	S3StorageSchema,
	s3StorageActionIntent,
} from '#app/components/settings/cards/organization/s3-storage-card'
import TeamSizeCard, {
	TeamSizeSchema,
} from '#app/components/settings/cards/organization/team-size-card'
import VerifiedDomainCard, {
	VerifiedDomainSchema,
} from '#app/components/settings/cards/organization/verified-domain-card'
import {
	AnnotatedLayout,
	AnnotatedSection,
} from '#app/components/ui/annotated-layout'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { encrypt } from '#app/utils/encryption.server'
import { markStepCompleted } from '#app/utils/onboarding'
import {
	uploadOrganizationImage,
	testS3Connection,
} from '#app/utils/storage.server.ts'
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
			size: true,
			verifiedDomain: true,
			s3Config: {
				select: {
					id: true,
					isEnabled: true,
					endpoint: true,
					bucketName: true,
					accessKeyId: true,
					secretAccessKey: true,
					region: true,
				},
			},
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
		select: {
			id: true,
			name: true,
			slug: true,
			size: true,
			verifiedDomain: true,
			s3Config: {
				select: {
					id: true,
					isEnabled: true,
					endpoint: true,
					bucketName: true,
					accessKeyId: true,
					secretAccessKey: true,
					region: true,
				},
			},
		},
	})

	// Get user email for domain validation
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { email: true },
	})

	if (!organization || !user) {
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

			// Track onboarding step completion for completing profile
			// Check if organization now has both name and description (or just name for basic completion)
			try {
				await markStepCompleted(userId, organization.id, 'complete_profile', {
					completedVia: 'organization_settings_update',
					updatedFields: { name, slug },
				})
			} catch (error) {
				// Don't fail the settings update if onboarding tracking fails
				console.error(
					'Failed to track profile completion onboarding step:',
					error,
				)
			}

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

	if (intent === 'update-team-size') {
		const submission = parseWithZod(formData, {
			schema: TeamSizeSchema,
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const { size } = submission.value

		try {
			await prisma.organization.update({
				where: { id: organization.id },
				data: { size },
			})

			return redirectWithToast(`/app/${organization.slug}/settings`, {
				title: 'Team size updated',
				description: 'Your organization team size has been updated.',
				type: 'success',
			})
		} catch (error) {
			console.error('Error updating team size:', error)
			return Response.json({
				result: submission.reply({
					formErrors: ['Failed to update team size. Please try again.'],
				}),
			})
		}
	}

	if (intent === 'verified-domain') {
		const submission = parseWithZod(formData, {
			schema: VerifiedDomainSchema.superRefine((data, ctx) => {
				if (data.verifiedDomain) {
					// Block common domains
					if (
						[
							'gmail.com',
							'yahoo.com',
							'hotmail.com',
							'outlook.com',
							'icloud.com',
						].includes(data.verifiedDomain)
					) {
						ctx.addIssue({
							path: ['verifiedDomain'],
							code: z.ZodIssueCode.custom,
							message: 'Email domain is not supported.',
						})
						return
					}

					// Check if user's email domain matches the verified domain
					if (!user.email.endsWith(`@${data.verifiedDomain}`)) {
						ctx.addIssue({
							path: ['verifiedDomain'],
							code: z.ZodIssueCode.custom,
							message: `The domain provided does not match your email address domain. Please update your email to match the domain and try again.`,
						})
						return
					}
				}
			}),
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const { verifiedDomain } = submission.value

		try {
			await prisma.$transaction(async (tx) => {
				// Update the organization with the verified domain
				await tx.organization.update({
					where: { id: organization.id },
					data: { verifiedDomain },
				})

				// Find all users with emails ending with this domain who are not already members
				const usersWithMatchingDomain = await tx.user.findMany({
					where: {
						email: {
							endsWith: `@${verifiedDomain}`,
						},
						organizations: {
							none: {
								organizationId: organization.id,
							},
						},
					},
					select: {
						id: true,
						email: true,
						name: true,
					},
				})

				// Auto-add these users to the organization
				if (usersWithMatchingDomain.length > 0) {
					await tx.userOrganization.createMany({
						data: usersWithMatchingDomain.map((user) => ({
							userId: user.id,
							organizationId: organization.id,
							role: 'MEMBER', // Default role
						})),
					})
				}

				console.log(
					`Auto-added ${usersWithMatchingDomain.length} users to organization ${organization.name} based on verified domain ${verifiedDomain}`,
				)
			})

			return redirectWithToast(`/app/${organization.slug}/settings`, {
				title: 'Verified domain updated',
				description:
					'Your organization verified domain has been updated and matching users have been automatically added.',
				type: 'success',
			})
		} catch (error) {
			console.error('Error updating verified domain:', error)
			return Response.json({
				result: submission.reply({
					formErrors: ['Failed to update verified domain. Please try again.'],
				}),
			})
		}
	}

	if (intent === 'toggle-verified-domain') {
		try {
			await prisma.organization.update({
				where: { id: organization.id },
				data: { verifiedDomain: null },
			})

			return Response.json({ status: 'success' })
		} catch (error) {
			console.error('Error removing verified domain:', error)
			return Response.json(
				{ error: 'Failed to remove verified domain' },
				{ status: 500 },
			)
		}
	}

	if (intent === 'delete-organization') {
		try {
			// Delete the organization - cascade deletes will handle all related data
			await prisma.organization.delete({
				where: { id: organization.id },
			})

			return redirectWithToast('/app', {
				title: 'Organization deleted',
				description: 'Your organization has been permanently deleted.',
				type: 'success',
			})
		} catch (error) {
			console.error('Error deleting organization:', error)
			return Response.json(
				{ error: 'Failed to delete organization' },
				{ status: 500 },
			)
		}
	}

	if (intent === s3StorageActionIntent) {
		const submission = parseWithZod(formData, {
			schema: S3StorageSchema,
		})

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() })
		}

		const {
			s3Enabled,
			s3Endpoint,
			s3BucketName,
			s3AccessKeyId,
			s3SecretAccessKey,
			s3Region,
		} = submission.value

		try {
			if (s3Enabled) {
				// Get existing config to preserve secret key if not updated
				const existingConfig = await prisma.organizationS3Config.findUnique({
					where: { organizationId: organization.id },
				})

				const secretToUse = s3SecretAccessKey
					? encrypt(s3SecretAccessKey)
					: existingConfig?.secretAccessKey || ''

				// Create or update S3 configuration
				await prisma.organizationS3Config.upsert({
					where: { organizationId: organization.id },
					create: {
						organizationId: organization.id,
						isEnabled: true,
						endpoint: s3Endpoint || '',
						bucketName: s3BucketName || '',
						accessKeyId: s3AccessKeyId || '',
						secretAccessKey: secretToUse,
						region: s3Region || '',
					},
					update: {
						isEnabled: true,
						endpoint: s3Endpoint || '',
						bucketName: s3BucketName || '',
						accessKeyId: s3AccessKeyId || '',
						secretAccessKey: secretToUse,
						region: s3Region || '',
					},
				})
			} else {
				// Disable S3 configuration or delete it
				await prisma.organizationS3Config.upsert({
					where: { organizationId: organization.id },
					create: {
						organizationId: organization.id,
						isEnabled: false,
						endpoint: '',
						bucketName: '',
						accessKeyId: '',
						secretAccessKey: '',
						region: '',
					},
					update: {
						isEnabled: false,
					},
				})
			}

			return redirectWithToast(`/app/${organization.slug}/settings`, {
				title: 'S3 Storage updated',
				description: s3Enabled
					? 'Your custom S3 storage configuration has been saved.'
					: 'S3 storage has been disabled. Using default storage.',
				type: 'success',
			})
		} catch (error) {
			console.error('Error updating S3 storage:', error)
			return Response.json({
				result: submission.reply({
					formErrors: [
						'Failed to update S3 storage settings. Please try again.',
					],
				}),
			})
		}
	}

	if (intent === 'test-s3-connection') {
		const s3Endpoint = formData.get('s3Endpoint') as string
		const s3BucketName = formData.get('s3BucketName') as string
		const s3AccessKeyId = formData.get('s3AccessKeyId') as string
		const s3SecretAccessKey = formData.get('s3SecretAccessKey') as string
		const s3Region = formData.get('s3Region') as string

		if (
			!s3Endpoint ||
			!s3BucketName ||
			!s3AccessKeyId ||
			!s3SecretAccessKey ||
			!s3Region
		) {
			return Response.json({
				connectionTest: {
					success: false,
					message: 'All S3 configuration fields are required for testing.',
				},
			})
		}

		const config = {
			endpoint: s3Endpoint,
			bucket: s3BucketName,
			accessKey: s3AccessKeyId,
			secretKey: s3SecretAccessKey,
			region: s3Region,
		}

		const testResult = await testS3Connection(config)
		return Response.json({ connectionTest: testResult })
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

			<AnnotatedSection
				title="Additional Information"
				description="Help us understand your organization better."
			>
				<TeamSizeCard organization={organization} actionData={actionData} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Verified Domains"
				description="Automatically add team members based on their email domain."
			>
				<VerifiedDomainCard
					organization={organization}
					actionData={actionData}
				/>
			</AnnotatedSection>

			<AnnotatedSection
				title="Storage Configuration"
				description="Configure custom S3-compatible storage for your organization's files."
			>
				<S3StorageCard organization={organization} actionData={actionData} />
			</AnnotatedSection>

			<AnnotatedSection
				title="Danger Zone"
				description="Be careful, an organization deletion cannot be undone."
			>
				<DangerZoneCard organization={organization} />
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
