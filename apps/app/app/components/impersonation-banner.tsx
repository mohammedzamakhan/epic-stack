import { Trans, Plural } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Form } from 'react-router'

import { type ImpersonationInfo } from '#app/utils/impersonation.server.ts'

interface ImpersonationBannerProps {
	impersonationInfo: ImpersonationInfo
}

export function ImpersonationBanner({
	impersonationInfo,
}: ImpersonationBannerProps) {
	const startedAt = new Date(impersonationInfo.startedAt)
	const duration = Math.floor((Date.now() - startedAt.getTime()) / 1000 / 60) // minutes

	return (
		<div className="border-b px-6 py-3">
			<div className="mx-auto flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-destructive flex items-center gap-2">
						<Icon name="alert-triangle" className="h-5 w-5" />
					</div>
					<div className="text-sm">
						<span className="text-destructive font-medium">
							<Trans>Admin Impersonation Active</Trans>
						</span>
						<span className="text-destructive/80 ml-2">
							<Trans>
								You are impersonating{' '}
								<strong>{impersonationInfo.targetName}</strong>
							</Trans>
						</span>
						<span className="text-destructive/60 ml-2">
							(
							<Plural
								value={duration}
								one="# minute ago"
								other="# minutes ago"
							/>
							)
						</span>
					</div>
				</div>
				<Form method="post" action="/stop-impersonation">
					<Button
						type="submit"
						variant="outline"
						size="sm"
						className="border-destructive/30 bg-background text-destructive hover:border-destructive/50 hover:bg-destructive/5"
					>
						<Icon name="x" className="mr-1 h-4 w-4" />
						<Trans>Stop Impersonation</Trans>
					</Button>
				</Form>
			</div>
		</div>
	)
}
