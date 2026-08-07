import { requireUserId } from '@repo/auth'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { type LoaderFunctionArgs } from 'react-router'
import { NotificationPreferencesCard } from '#app/components/settings/cards/notification-preferences-card.tsx'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	await requireUserOrganization(request, params.orgSlug, {
		id: true,
	})
	return {}
}

export default function NotificationSettings() {
	return (
		<AnnotatedLayout>
			<AnnotatedSection>
				<NotificationPreferencesCard />
			</AnnotatedSection>
		</AnnotatedLayout>
	)
}
