import { parseWithZod } from '@conform-to/zod'
import { createId as cuid } from '@paralleldrive/cuid2'
import { requireUserId } from '@repo/auth'
import { prisma } from '@repo/database'
import { projectHooks } from '@repo/integrations'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { logProjectActivity } from '#app/utils/project-activity-log.server.ts'
import { ProjectEditorSchema } from './__project-editor'

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const orgSlug = params.orgSlug

	// Find organization ID
	const organization = await prisma.organization.findFirst({
		where: { slug: orgSlug, users: { some: { userId } } },
		select: { id: true },
	})

	if (!organization) {
		throw new Response('Organization not found or you do not have access', {
			status: 404,
		})
	}

	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: ProjectEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const project = await prisma.project.findUnique({
				select: { id: true },
				where: { id: data.id, organizationId: organization.id },
			})
			if (!project) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Project not found',
				})
			}
		}).transform(async (data) => {
			const projectId = data.id ?? cuid()

			return {
				...data,
				id: projectId,
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id: projectId, name, description, color } = submission.value

	// Check if project with same name exists in organization (excluding current project)
	const existingProject = await prisma.project.findFirst({
		where: {
			organizationId: organization.id,
			name,
			id: { not: projectId },
		},
	})

	if (existingProject) {
		return data(
			{
				result: submission.reply({
					fieldErrors: {
						name: ['A project with this name already exists'],
					},
				}),
			},
			{ status: 400 },
		)
	}

	// Create or update project
	const isUpdate = Boolean(
		submission.value.id &&
		(await prisma.project.findUnique({ where: { id: projectId } })),
	)

	// Get previous data for change detection if updating
	let previousData = null
	if (isUpdate) {
		const existing = await prisma.project.findUnique({
			where: { id: projectId },
			select: { name: true, description: true },
		})
		previousData = existing
	}

	const project = await prisma.project.upsert({
		where: { id: projectId },
		create: {
			id: projectId,
			name,
			description,
			color,
			organizationId: organization.id,
			createdById: userId,
		},
		update: {
			name,
			description,
			color,
		},
		select: { id: true },
	})

	// Log activity
	try {
		await logProjectActivity({
			projectId: project.id,
			userId,
			action: isUpdate ? 'updated' : 'created',
			metadata: {
				name,
				description,
				color,
			},
		})
	} catch (error) {
		// Don't fail the request if activity logging fails
		console.error('Failed to log project activity:', error)
	}

	// Trigger integration hooks
	try {
		if (isUpdate) {
			await projectHooks.afterProjectUpdated(
				project.id,
				userId,
				previousData || undefined,
			)
		} else {
			await projectHooks.afterProjectCreated(project.id, userId)
		}
	} catch (error) {
		// Don't fail the request if integration hooks fail
		console.error('Failed to trigger project hooks:', error)
	}

	throw redirect(`/${orgSlug}/projects`)
}
