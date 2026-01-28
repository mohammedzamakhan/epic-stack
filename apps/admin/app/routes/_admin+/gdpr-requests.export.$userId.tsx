import { auditService, AuditAction } from '@repo/audit'
import { requireUserWithRole } from '@repo/auth'
import { gatherUserDataForExport } from '@repo/common/gdpr-export'
import { prisma } from '@repo/database'
import { type LoaderFunctionArgs } from 'react-router'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const adminId = await requireUserWithRole(request, 'admin')
	const { userId } = params

	if (!userId) {
		throw new Response('User ID required', { status: 400 })
	}

	const targetUser = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, email: true, username: true },
	})

	if (!targetUser) {
		throw new Response('User not found', { status: 404 })
	}

	const dsr = await prisma.dataSubjectRequest.create({
		data: {
			userId,
			type: 'export',
			status: 'processing',
			processedAt: new Date(),
			metadata: JSON.stringify({ adminInitiated: true, adminId }),
		},
	})

	await auditService.log({
		action: AuditAction.DATA_EXPORT_REQUESTED,
		userId: adminId,
		targetUserId: userId,
		details: `Admin initiated data export for user ${targetUser.email}`,
		resourceType: 'data_subject_request',
		resourceId: dsr.id,
		request,
		metadata: { adminAction: true },
		severity: 'info',
	})

	// Reuse the existing gatherUserDataForExport function
	const baseExportData = await gatherUserDataForExport(userId, request)

	// Extend with admin-specific fields
	const exportData = {
		...baseExportData,
		exportedBy: {
			adminId,
			reason: 'Admin-initiated GDPR data export',
		},
	}

	// Update the data subject request status
	await prisma.dataSubjectRequest.update({
		where: { id: dsr.id },
		data: {
			status: 'completed',
			completedAt: new Date(),
			metadata: JSON.stringify({
				adminInitiated: true,
				adminId,
				statistics: exportData.statistics,
			}),
		},
	})

	await auditService.log({
		action: AuditAction.DATA_EXPORT_COMPLETED,
		userId: adminId,
		targetUserId: userId,
		details: `Admin completed data export for user ${targetUser.email}`,
		resourceType: 'data_subject_request',
		resourceId: dsr.id,
		request,
		metadata: {
			adminAction: true,
			statistics: exportData.statistics,
		},
		severity: 'info',
	})

	const timestamp = new Date().toISOString().split('T')[0]
	const filename = `user-data-export-${targetUser.username}-${timestamp}.json`

	return new Response(JSON.stringify(exportData, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store, no-cache, must-revalidate',
		},
	})
}
