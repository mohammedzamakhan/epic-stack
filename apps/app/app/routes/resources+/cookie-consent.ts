import {
	getConsentPreferences,
	setConsentPreferences,
	setConsentAcceptAll,
	setConsentRejectAll,
} from '@repo/common/cookie-consent'
import { type ActionFunctionArgs } from 'react-router'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const intent = formData.get('intent')

	let cookie: string

	if (intent === 'accept-all') {
		cookie = await setConsentAcceptAll()
	} else if (intent === 'reject-all') {
		cookie = await setConsentRejectAll()
	} else if (intent === 'save-preferences') {
		cookie = await setConsentPreferences({
			analytics: formData.get('analytics') === 'true',
			marketing: formData.get('marketing') === 'true',
			preferences: formData.get('preferences') === 'true',
		})
	} else {
		return Response.json({ success: false, error: 'Invalid intent' }, { status: 400 })
	}

	// Fire-and-forget audit logging (only if user is authenticated)
	void (async () => {
		try {
			const { getUserId } = await import('@repo/auth')
			const userId = await getUserId(request)
			if (!userId) return

			const { auditService, AuditAction } = await import('@repo/audit')
			const previousPrefs = await getConsentPreferences(request)
			const isFirstConsent = !previousPrefs

			await auditService.log({
				action: isFirstConsent
					? AuditAction.COOKIE_CONSENT_GRANTED
					: AuditAction.COOKIE_CONSENT_UPDATED,
				userId,
				details: isFirstConsent
					? 'User granted cookie consent'
					: 'User updated cookie consent preferences',
				metadata: {
					intent,
					analytics: formData.get('analytics') ?? (intent === 'accept-all'),
					marketing: formData.get('marketing') ?? (intent === 'accept-all'),
					preferences: formData.get('preferences') ?? (intent === 'accept-all'),
				},
				request,
				severity: 'info',
			})
		} catch {
			// Audit failure must not break consent flow
		}
	})()

	const headers = new Headers()
	headers.append('Set-Cookie', cookie)

	return Response.json({ success: true }, { headers })
}
