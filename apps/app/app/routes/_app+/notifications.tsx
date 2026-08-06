import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { requireUserId } from '@repo/auth'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { PageTitle } from '@repo/ui/page-title'
import { type LoaderFunctionArgs } from 'react-router'
import { NotificationPreferencesCard } from '#app/components/settings/cards/notification-preferences-card.tsx'

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
		<div className="mx-auto w-full max-w-4xl py-8 md:p-8">
			<div className="mb-8 md:mb-10">
				<PageTitle
					title={_(t`Notification Settings`)}
					description={_(
						t`Manage your notification preferences for different channels and workflows.`,
					)}
				/>
			</div>
			<AnnotatedLayout>
				<AnnotatedSection>
					<NotificationPreferencesCard />
				</AnnotatedSection>
			</AnnotatedLayout>
		</div>
	)
}
