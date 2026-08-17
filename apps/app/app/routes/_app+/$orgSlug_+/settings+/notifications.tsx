import { requireUserId } from '@repo/auth'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { NotificationPreferencesCard } from '#app/components/settings/cards/notification-preferences-card.tsx'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const org = await requireUserOrganization(request, params.orgSlug, {
		id: true,
	})
	return { organizationId: org.id }
}

export default function NotificationSettings() {
	const { organizationId } = useLoaderData<typeof loader>()
	return (
		<AnnotatedLayout>
			<AnnotatedSection>
				<NotificationPreferencesCard organizationId={organizationId} />
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
