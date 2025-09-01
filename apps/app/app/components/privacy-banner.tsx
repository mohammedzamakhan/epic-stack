import { useEffect } from 'react'
import { Form, useFetcher } from 'react-router'
import { Button } from '@repo/ui'

export function CookieConsentBanner({ consent }: { consent: boolean | null }) {
	const fetcher = useFetcher()

	if (consent !== undefined) {
		return null
	}

	return (
		<div className="fixed bottom-0 left-0 z-10 box-border flex flex-row justify-center gap-5 p-5">
			<div className="flex items-end justify-start">
				<div className="relative z-[100] flex max-h-[calc(100vh-40px)] flex-col gap-3">
					<div className="w-full max-w-[360px] overflow-scroll rounded-2xl border bg-white shadow-xs">
						<div className="p-5">
							<div>
								<p className="m-0 p-0 text-sm leading-6 tracking-normal text-gray-800">
									We use cookies to enhance your experience, analyze site
									traffic and deliver personalized content.{' '}
									<a
										href="/legal/cookie-policy/"
										target="_blank"
										rel="noreferrer"
										className="text-blue-700 no-underline"
									>
										Read our Cookie Policy
									</a>
									.
								</p>
							</div>
							<div className="mt-4 flex flex-row gap-2.5">
								<Button
									type="button"
									variant="secondary"
									className="w-1/3"
									onClick={() => {
										void fetcher.submit(
											{ consent: 'false' },
											{ method: 'POST', action: '/resources/cookie-consent' },
										)
									}}
								>
									Reject
								</Button>
								<Button
									type="button"
									className="w-2/3"
									onClick={() => {
										void fetcher.submit(
											{ consent: 'true' },
											{ method: 'POST', action: '/resources/cookie-consent' },
										)
									}}
								>
									Accept
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
