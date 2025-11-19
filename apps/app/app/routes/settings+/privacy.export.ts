import { type Route } from './+types/privacy.export'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

/**
 * GDPR Right to Data Portability - Export user data
 * Returns a comprehensive JSON export of all user personal data
 */
export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	// Fetch all user data with related information
	const userData = await prisma.user.findUnique({
		where: { id: userId },
		include: {
			image: true,
			password: { select: { hash: false } }, // Don't export password hash
			sessions: {
				select: {
					id: true,
					createdAt: true,
					expirationDate: true,
				},
			},
			refreshTokens: {
				select: {
					id: true,
					userAgent: true,
					ipAddress: true,
					createdAt: true,
					expiresAt: true,
					revoked: true,
				},
			},
			connections: {
				select: {
					id: true,
					providerName: true,
					providerId: true,
					createdAt: true,
				},
			},
			passkey: {
				select: {
					id: true,
					deviceType: true,
					createdAt: true,
					backedUp: true,
				},
			},
			notes: {
				select: {
					id: true,
					title: true,
					content: true,
					createdAt: true,
					updatedAt: true,
					images: {
						select: {
							id: true,
							altText: true,
							objectKey: true,
							createdAt: true,
						},
					},
				},
			},
			organizations: {
				select: {
					organizationId: true,
					createdAt: true,
					active: true,
					isDefault: true,
					department: true,
					organizationRole: {
						select: {
							name: true,
						},
					},
					organization: {
						select: {
							name: true,
							slug: true,
						},
					},
				},
			},
			utmSource: {
				select: {
					source: true,
					medium: true,
					campaign: true,
					term: true,
					content: true,
					referrer: true,
					createdAt: true,
				},
			},
			roles: {
				select: {
					name: true,
					description: true,
				},
			},
			auditLogs: {
				select: {
					id: true,
					action: true,
					details: true,
					ipAddress: true,
					userAgent: true,
					resourceType: true,
					resourceId: true,
					severity: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: 'desc',
				},
			},
			apiKeys: {
				select: {
					id: true,
					name: true,
					createdAt: true,
					lastUsedAt: true,
					expiresAt: true,
				},
			},
			ipAddressUsers: {
				select: {
					firstSeenAt: true,
					lastSeenAt: true,
					requestCount: true,
					ipAddress: {
						select: {
							ip: true,
							country: true,
							region: true,
							city: true,
						},
					},
				},
			},
			waitlistEntry: {
				select: {
					points: true,
					referralCode: true,
					hasJoinedDiscord: true,
					hasEarlyAccess: true,
					grantedAccessAt: true,
					createdAt: true,
				},
			},
		},
	})

	if (!userData) {
		throw new Response('User not found', { status: 404 })
	}

	// Get organization notes created by user
	const orgNotes = await prisma.organizationNote.findMany({
		where: { createdById: userId },
		select: {
			id: true,
			title: true,
			content: true,
			isPublic: true,
			priority: true,
			tags: true,
			createdAt: true,
			updatedAt: true,
			organization: {
				select: {
					name: true,
					slug: true,
				},
			},
			comments: {
				where: { userId },
				select: {
					id: true,
					content: true,
					createdAt: true,
					updatedAt: true,
				},
			},
		},
	})

	// Get feedback submitted by user
	const feedback = await prisma.feedback.findMany({
		where: { userId },
		select: {
			id: true,
			message: true,
			type: true,
			createdAt: true,
			organization: {
				select: {
					name: true,
				},
			},
		},
	})

	// Prepare the export data structure
	const exportData = {
		exportInfo: {
			generatedAt: new Date().toISOString(),
			userId: userData.id,
			format: 'JSON',
			gdprCompliant: true,
		},
		personalInformation: {
			id: userData.id,
			email: userData.email,
			username: userData.username,
			name: userData.name,
			createdAt: userData.createdAt,
			updatedAt: userData.updatedAt,
		},
		consentPreferences: {
			privacyConsent: userData.privacyConsent,
			marketingConsent: userData.marketingConsent,
			analyticsConsent: userData.analyticsConsent,
			dataProcessingConsent: userData.dataProcessingConsent,
			consentUpdatedAt: userData.consentUpdatedAt,
		},
		accountStatus: {
			isBanned: userData.isBanned,
			banReason: userData.banReason,
			banExpiresAt: userData.banExpiresAt,
			bannedAt: userData.bannedAt,
		},
		profileImage: userData.image
			? {
					altText: userData.image.altText,
					objectKey: userData.image.objectKey,
					createdAt: userData.image.createdAt,
				}
			: null,
		authentication: {
			hasPassword: !!userData.password,
			connections: userData.connections,
			passkeys: userData.passkey,
		},
		sessions: {
			active: userData.sessions.length,
			details: userData.sessions,
		},
		refreshTokens: userData.refreshTokens,
		notes: userData.notes,
		organizations: userData.organizations,
		organizationNotes: orgNotes,
		feedback: feedback,
		roles: userData.roles,
		apiKeys: userData.apiKeys,
		trackingData: {
			utmSource: userData.utmSource,
			ipAddresses: userData.ipAddressUsers,
		},
		waitlist: userData.waitlistEntry,
		auditLogs: {
			count: userData.auditLogs.length,
			recentActivity: userData.auditLogs.slice(0, 100), // Last 100 events
		},
	}

	// Log the export action for audit trail
	await prisma.auditLog.create({
		data: {
			userId,
			action: 'user_data_export',
			details: 'User exported their personal data (GDPR)',
			ipAddress: request.headers.get('x-forwarded-for') || undefined,
			userAgent: request.headers.get('user-agent') || undefined,
			resourceType: 'user',
			resourceId: userId,
			severity: 'info',
		},
	})

	const filename = `user-data-export-${userData.username}-${new Date().toISOString().split('T')[0]}.json`

	return new Response(JSON.stringify(exportData, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		},
	})
}
