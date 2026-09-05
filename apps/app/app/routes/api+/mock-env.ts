import { type ActionFunctionArgs } from 'react-router'
import { __setMockLaunchStatus } from '#app/utils/env.server.ts'

export async function action({ request }: ActionFunctionArgs) {
	if (process.env.NODE_ENV === 'production' && !process.env.MOCKS) {
		throw new Response('Not Found', { status: 404 })
	}
	const formData = await request.formData()
	const status = formData.get('status')
	__setMockLaunchStatus(status ? String(status) : null)
	return Response.json({ success: true })
}
