import { logout } from '@repo/auth'
import { redirect } from 'react-router'
import { type Route } from './+types/logout.ts'

export async function loader() {
	return redirect('/login')
}

export async function action({ request }: Route.ActionArgs) {
	return logout({ request })
}
