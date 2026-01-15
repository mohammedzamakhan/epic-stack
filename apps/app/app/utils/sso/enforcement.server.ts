/**
 * SSO Enforcement Service
 *
 * Checks if users are required to use SSO login based on their organization membership.
 * When enforced, users cannot use password or social login.
 */

import { prisma } from '@repo/database'

export interface SSOEnforcementResult {
	enforced: boolean
	organizationId?: string
	organizationName?: string
	organizationSlug?: string
	message?: string
}

/**
 * Check if a user (by email) is required to use SSO login
 *
 * Returns enforcement info if the user belongs to an organization with enforced SSO.
 * This should be called before allowing password or social login.
 */
export async function checkSSOEnforcementByEmail(
	email: string,
): Promise<SSOEnforcementResult> {
	try {
		// Find user by email with their organization memberships
		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase() },
			include: {
				organizations: {
					include: {
						organization: {
							include: {
								ssoConfiguration: true,
							},
						},
					},
				},
			},
		})

		if (!user) {
			// User doesn't exist, no enforcement
			return { enforced: false }
		}

		// Check each organization the user belongs to
		for (const membership of user.organizations) {
			const org = membership.organization
			const ssoConfig = org.ssoConfiguration as any

			// If org has SSO enabled AND enforced, block non-SSO login
			if (ssoConfig?.isEnabled && ssoConfig?.enforceSSOLogin) {
				return {
					enforced: true,
					organizationId: org.id,
					organizationName: org.name,
					organizationSlug: org.slug,
					message: `Your organization "${org.name}" requires SSO login. Please use the SSO login option.`,
				}
			}
		}

		return { enforced: false }
	} catch (error) {
		// On error, don't block login (fail open for availability)
		console.error('SSO enforcement check failed:', error)
		return { enforced: false }
	}
}

/**
 * Check if a user (by ID) is required to use SSO login
 */
export async function checkSSOEnforcementByUserId(
	userId: string,
): Promise<SSOEnforcementResult> {
	try {
		const user = await prisma.user.findUnique({
			where: { id: userId },
			include: {
				organizations: {
					include: {
						organization: {
							include: {
								ssoConfiguration: true,
							},
						},
					},
				},
			},
		})

		if (!user) {
			return { enforced: false }
		}

		for (const membership of user.organizations) {
			const org = membership.organization
			const ssoConfig = org.ssoConfiguration as any

			if (ssoConfig?.isEnabled && ssoConfig?.enforceSSOLogin) {
				return {
					enforced: true,
					organizationId: org.id,
					organizationName: org.name,
					organizationSlug: org.slug,
					message: `Your organization "${org.name}" requires SSO login.`,
				}
			}
		}

		return { enforced: false }
	} catch (error) {
		console.error('SSO enforcement check failed:', error)
		return { enforced: false }
	}
}

/**
 * Get the SSO login URL for an organization
 */
export function getSSOLoginUrl(organizationSlug: string): string {
	return `/auth/sso/${organizationSlug}`
}

/**
 * Error class for SSO enforcement violations
 */
export class SSOEnforcementError extends Error {
	public readonly organizationSlug: string
	public readonly ssoLoginUrl: string

	constructor(result: SSOEnforcementResult) {
		super(result.message || 'SSO login is required for your organization')
		this.name = 'SSOEnforcementError'
		this.organizationSlug = result.organizationSlug || ''
		this.ssoLoginUrl = getSSOLoginUrl(this.organizationSlug)
	}
}
