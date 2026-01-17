// app/routes/resources+/sidebar-state.ts
import { type ActionFunctionArgs } from 'react-router'
import { setSidebarState } from '@repo/common/sidebar-cookie'

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const isCollapsed = formData.get('isCollapsed') === 'true'

	const cookie = await setSidebarState(isCollapsed)

	return Response.json(
		{ success: true },
		{
			headers: {
				'Set-Cookie': cookie,
			},
		},
	)
}
