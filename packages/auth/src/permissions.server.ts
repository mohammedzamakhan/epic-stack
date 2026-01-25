import { prisma } from '@repo/database'
import { data } from 'react-router'
import {
	parsePermissionString,
	type PermissionString,
} from '@repo/common/user-permissions'

export async function checkUserHasPermission(
	userId: string,
	permission: PermissionString,
): Promise<string> {
	const permissionData = parsePermissionString(permission)
	const user = await prisma.user.findFirst({
		select: { id: true },
		where: {
			id: userId,
			roles: {
				some: {
					permissions: {
						some: {
							...permissionData,
							access: permissionData.access
								? { in: permissionData.access }
								: undefined,
						},
					},
				},
			},
		},
	})
	if (!user) {
		throw data(
			{
				error: 'Unauthorized',
				requiredPermission: permissionData,
				message: `Unauthorized: required permissions: ${permission}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}

export async function checkUserHasRole(
	userId: string,
	name: string,
): Promise<{ id: string; defaultOrganizationId: string | null }> {
	const user = await prisma.user.findFirst({
		select: {
			id: true,
			organizations: {
				where: { isDefault: true },
				select: { organizationId: true },
			},
		},
		where: { id: userId, roles: { some: { name } } },
	})

	if (!user) {
		throw data(
			{
				error: 'Unauthorized',
				requiredRole: name,
				message: `Unauthorized: required role: ${name}`,
			},
			{ status: 403 },
		)
	}
	return {
		id: user.id,
		defaultOrganizationId: user.organizations[0]?.organizationId ?? null,
	}
}
