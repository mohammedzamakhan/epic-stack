import { redirectWithToast } from '#app/utils/toast.server.ts'

export async function loader() {
	return redirectWithToast('/organizations/create', {
		title: 'Create an organization',
		description: 'Organizations are used to group your projects.',
		type: 'error',
	})
}
