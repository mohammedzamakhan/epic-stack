import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { PageTitle } from '@repo/ui/page-title'
import { type LoaderFunctionArgs } from 'react-router'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
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
	const { _ } = useLingui()

	return (
		<div className="my-8 flex flex-1 flex-col gap-4 md:m-8">
			<AnnotatedLayout>
				<PageTitle
					title={_(t`Notification Settings`)}
					description={_(t`Manage your notification preferences for different channels and workflows.`)}
				/>
				<AnnotatedSection>
					<NotificationPreferencesCard />
				</AnnotatedSection>
			</AnnotatedLayout>
		</div>
	)
}
