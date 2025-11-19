import { Trans, Plural } from '@lingui/macro'
import { Icon } from '@repo/ui/icon'
import { StatusButton } from '@repo/ui/status-button'
import { useFetcher } from 'react-router'
import {
	deleteDataActionIntent,
	signOutOfSessionsActionIntent,
} from '#app/routes/_app+/security.tsx'
import { useDoubleCheck } from '#app/utils/misc.tsx'

interface SignOutOfSessionsProps {
	data: {
		user: {
			email: string
			_count: {
				sessions: number
			}
		}
	}
}

export function SignOutOfSessions({ data }: SignOutOfSessionsProps) {
	const dc = useDoubleCheck()
	const fetcher = useFetcher()
	const otherSessionsCount = data.user._count.sessions - 1

	if (otherSessionsCount <= 0) {
		return (
			<div className="flex items-center">
				<Icon name="user" className="mr-2" />
				<span>
					<Trans>This is your only active session</Trans>
				</span>
			</div>
		)
	}

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center">
				<Icon name="user" className="mr-2" />
				<span>
					<Plural
						value={otherSessionsCount}
						one="You have # other active session"
						other="You have # other active sessions"
					/>
				</span>
			</div>
			<fetcher.Form method="POST">
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: signOutOfSessionsActionIntent,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'outline'}
					status={
						fetcher.state !== 'idle'
							? 'pending'
							: (fetcher.data?.status ?? 'idle')
					}
				>
					{dc.doubleCheck ? (
						<Trans>Are you sure?</Trans>
					) : (
						<Plural
							value={otherSessionsCount}
							one="Sign out of other session"
							other="Sign out of other sessions"
						/>
					)}
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}

export function DeleteData() {
	const dc = useDoubleCheck()
	const fetcher = useFetcher()

	return (
		<div className="flex items-center justify-between">
			<fetcher.Form method="POST">
				<StatusButton
					{...dc.getButtonProps({
						type: 'submit',
						name: 'intent',
						value: deleteDataActionIntent,
					})}
					variant={dc.doubleCheck ? 'destructive' : 'outline'}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
				>
					<Icon name="trash-2" />
					{dc.doubleCheck ? (
						<Trans>Are you sure?</Trans>
					) : (
						<Trans>Delete account</Trans>
					)}
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}
