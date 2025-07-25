import * as React from 'react'
import { Inbox } from '@novu/react'
import { useNavigate } from 'react-router'

export function NotificationCenter() {
	const navigate = useNavigate()

	// Type assertion to fix React component compatibility issue
	const InboxComponent = Inbox as React.ComponentType<{
		applicationIdentifier: string
		subscriber: string
		routerPush: (path: string) => void
	}>

	return (
		<InboxComponent
			applicationIdentifier="YOUR_APPLICATION_IDENTIFIER"
			subscriber="YOUR_SUBSCRIBER_ID"
			routerPush={(path: string) => navigate(path)}
		/>
	)
}
