import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { AnnotatedLayout, AnnotatedSection, PageTitle } from '@repo/ui'
import { type LoaderFunctionArgs } from 'react-router'
import { NotificationPreferencesCard } from '#app/components/settings/cards/notification-preferences-card.tsx'

import { requireUserId } from '#app/utils/auth.server.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	return {}
}

export default function NotificationSettings() {
	return (
		<div className="my-8 flex flex-1 flex-col gap-4 md:m-8">
			<AnnotatedLayout>
				<PageTitle
					title="Notification Settings"
					description="Manage your notification preferences for different channels and workflows."
				/>
				<AnnotatedSection>
					<NotificationPreferencesCard />
				</AnnotatedSection>
			</AnnotatedLayout>
		</div>
	)
}
