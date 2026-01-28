import { prisma } from '@repo/database'
import {
	impersonationSessionStorage,
	impersonationSessionKey,
	getClientIp,
	hashIp,
} from './impersonation-session.server.ts'

export interface ImpersonationInfo {
	adminUserId: string
	adminName: string
	targetUserId: string
	targetName: string
	startedAt: string
	expiresAt: string
}

export interface ImpersonationValidationResult {
	valid: boolean
	info: ImpersonationInfo | null
	invalidReason?: 'not_found' | 'expired' | 'ip_mismatch'
}

async function getImpersonationSessionId(
	request: Request,
): Promise<string | null> {
	const session = await impersonationSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	return session.get(impersonationSessionKey) || null
}

export async function validateImpersonation(
	request: Request,
): Promise<ImpersonationValidationResult> {
	const sessionId = await getImpersonationSessionId(request)
	if (!sessionId) {
		return { valid: false, info: null }
	}

	const impersonationSession = await prisma.impersonationSession.findUnique({
		where: { id: sessionId },
		include: {
			adminUser: { select: { id: true, name: true, username: true } },
			targetUser: { select: { id: true, name: true, username: true } },
		},
	})

	if (!impersonationSession) {
		return { valid: false, info: null, invalidReason: 'not_found' }
	}

	const now = new Date()
	if (impersonationSession.expiresAt <= now) {
		return { valid: false, info: null, invalidReason: 'expired' }
	}

	const clientIp = getClientIp(request)
	const clientIpHash = hashIp(clientIp)
	if (clientIpHash !== impersonationSession.ipHash) {
		return { valid: false, info: null, invalidReason: 'ip_mismatch' }
	}

	const info: ImpersonationInfo = {
		adminUserId: impersonationSession.adminUserId,
		adminName:
			impersonationSession.adminUser.name ||
			impersonationSession.adminUser.username,
		targetUserId: impersonationSession.targetUserId,
		targetName:
			impersonationSession.targetUser.name ||
			impersonationSession.targetUser.username,
		startedAt: impersonationSession.createdAt.toISOString(),
		expiresAt: impersonationSession.expiresAt.toISOString(),
	}

	return { valid: true, info }
}

export async function getImpersonationInfo(
	request: Request,
): Promise<ImpersonationInfo | null> {
	const result = await validateImpersonation(request)
	return result.info
}

export async function isImpersonating(request: Request): Promise<boolean> {
	const result = await validateImpersonation(request)
	return result.valid
}

export async function getEffectiveUserId(
	request: Request,
	originalUserId: string,
): Promise<{ userId: string; isImpersonating: boolean }> {
	const result = await validateImpersonation(request)
	if (result.valid && result.info) {
		return { userId: result.info.targetUserId, isImpersonating: true }
	}
	return { userId: originalUserId, isImpersonating: false }
}

export async function destroyImpersonationSession(
	request: Request,
): Promise<string> {
	const session = await impersonationSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	return impersonationSessionStorage.destroySession(session)
}

export async function deleteImpersonationSessionFromDb(
	sessionId: string,
): Promise<void> {
	await prisma.impersonationSession
		.delete({ where: { id: sessionId } })
		.catch(() => {
			// Session may already be expired/deleted, ignore errors
		})
}

export async function cleanupExpiredImpersonationSessions(): Promise<number> {
	const result = await prisma.impersonationSession.deleteMany({
		where: { expiresAt: { lte: new Date() } },
	})
	return result.count
}
