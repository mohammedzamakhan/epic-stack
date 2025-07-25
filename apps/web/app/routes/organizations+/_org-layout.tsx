import { Outlet } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'

export async function loader({ request }: { request: Request }) {
	// This ensures users must be logged in to access any organization routes
	await requireUserId(request)
	return null
}

export default function OrganizationLayout() {
	return <Outlet />
}
