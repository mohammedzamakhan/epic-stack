import { authSessionStorage } from './session.server.ts'

export interface ImpersonationInfo {
	adminUserId: string
	adminName: string
	targetUserId: string
	targetName: string
	startedAt: string
}

export async function getImpersonationInfo(
	request: Request,
): Promise<ImpersonationInfo | null> {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)

	const impersonationInfo = authSession.get('impersonating')
	return impersonationInfo || null
}

export async function isImpersonating(request: Request): Promise<boolean> {
	const impersonationInfo = await getImpersonationInfo(request)
	return !!impersonationInfo
}
