import { type ActionFunctionArgs } from 'react-router'
import { setCookieConsentState } from '#app/utils/cookie-consent.server.ts'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const consent = formData.get('consent') === 'true'
	const cookie = await setCookieConsentState(consent)

	const headers = new Headers()
	headers.append('Set-Cookie', cookie)

	return Response.json({ success: true }, { headers })
}
