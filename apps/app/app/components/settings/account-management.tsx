import { useFetcher } from 'react-router'
import {
	deleteDataActionIntent,
	signOutOfSessionsActionIntent,
} from '#app/routes/app+/security.tsx'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { Icon, StatusButton } from '@repo/ui'

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
				<span>This is your only active session</span>
			</div>
		)
	}

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center">
				<Icon name="user" className="mr-2" />
				<span>
					You have {otherSessionsCount} other active{' '}
					{otherSessionsCount === 1 ? 'session' : 'sessions'}
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
					{dc.doubleCheck
						? 'Are you sure?'
						: `Sign out of other ${otherSessionsCount === 1 ? 'session' : 'sessions'}`}
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
			<div className="flex items-center">
				<Icon name="trash-2" className="mr-2" />
				<span>Delete all your data and account</span>
			</div>
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
					{dc.doubleCheck ? 'Are you sure?' : 'Delete account'}
				</StatusButton>
			</fetcher.Form>
		</div>
	)
}
