import { Trans } from '@lingui/macro'
import { Icon } from '@repo/ui/icon'
import { StatusButton } from '@repo/ui/status-button'
import { useFetcher } from 'react-router'
import { deleteDataActionIntent } from '#app/routes/_app+/security.tsx'
import { useDoubleCheck } from '#app/utils/misc.tsx'

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
