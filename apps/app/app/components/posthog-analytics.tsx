import { usePostHog } from '@posthog/react'
import { useEffect } from 'react'

const IDENTIFIED_USER_KEY = 'posthog_app_user_id'
const IDENTIFIED_ORGANIZATION_KEY = 'posthog_app_organization_id'

export function PostHogAnalytics({
	consent,
	userId,
	organizationId,
}: {
	consent: boolean | undefined
	userId?: string
	organizationId?: string
}) {
	const posthog = usePostHog()

	useEffect(() => {
		if (!posthog) return

		if (consent !== true) {
			posthog.opt_out_capturing()
			return
		}

		const wasOptedOut = posthog.has_opted_out_capturing()
		posthog.opt_in_capturing()

		const previousUserId = window.sessionStorage.getItem(IDENTIFIED_USER_KEY)

		if (!userId) {
			posthog.reset()
			window.sessionStorage.removeItem(IDENTIFIED_USER_KEY)
			window.sessionStorage.removeItem(IDENTIFIED_ORGANIZATION_KEY)
			if (wasOptedOut) posthog.capture('$pageview')
			return
		}

		if (previousUserId !== userId) {
			if (previousUserId) {
				posthog.reset()
				window.sessionStorage.removeItem(IDENTIFIED_ORGANIZATION_KEY)
			}
			posthog.identify(userId)
			window.sessionStorage.setItem(IDENTIFIED_USER_KEY, userId)
		}

		const previousOrganizationId = window.sessionStorage.getItem(
			IDENTIFIED_ORGANIZATION_KEY,
		)
		if (organizationId && previousOrganizationId !== organizationId) {
			posthog.group('organization', organizationId)
			window.sessionStorage.setItem(IDENTIFIED_ORGANIZATION_KEY, organizationId)
		} else if (!organizationId && previousOrganizationId) {
			posthog.resetGroups()
			window.sessionStorage.removeItem(IDENTIFIED_ORGANIZATION_KEY)
		}

		if (wasOptedOut) posthog.capture('$pageview')
	}, [consent, organizationId, posthog, userId])

	return null
}
