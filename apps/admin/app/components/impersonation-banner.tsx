import { Form } from 'react-router'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'

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
		<div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3">
			<div className="mx-auto flex max-w-7xl items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2 text-yellow-800">
						<Icon name="alert-triangle" className="h-5 w-5" />
						<Icon name="user" className="h-4 w-4" />
					</div>
					<div className="text-sm">
						<span className="font-medium text-yellow-900">
							Admin Impersonation Active
						</span>
						<span className="ml-2 text-yellow-700">
							You are impersonating{' '}
							<strong>{impersonationInfo.targetName}</strong>
						</span>
						<span className="ml-2 text-yellow-600">
							({duration} minute{duration !== 1 ? 's' : ''} ago)
						</span>
					</div>
				</div>
				<Form method="post" action="/stop-impersonation">
					<Button
						type="submit"
						variant="outline"
						size="sm"
						className="border-yellow-300 bg-white text-yellow-800 hover:border-yellow-400 hover:bg-yellow-50"
					>
						<Icon name="x" className="mr-1 h-4 w-4" />
						Stop Impersonation
					</Button>
				</Form>
			</div>
		</div>
	)
}
