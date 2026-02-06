import { Trans } from '@lingui/macro'
import type { CookieConsentPreferences } from '@repo/common/cookie-consent'
import { Button } from '@repo/ui/button'
import { Switch } from '@repo/ui/switch'
import { useState } from 'react'
import { useFetcher } from 'react-router'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsentCategory {
	key: 'necessary' | 'analytics' | 'marketing' | 'preferences'
	label: string
	description: string
	locked?: boolean
}

const CATEGORIES: ConsentCategory[] = [
	{
		key: 'necessary',
		label: 'Necessary',
		description:
			'Essential for the website to function. These cannot be disabled.',
		locked: true,
	},
	{
		key: 'analytics',
		label: 'Analytics',
		description:
			'Help us understand how visitors interact with the website by collecting anonymous usage data.',
	},
	{
		key: 'marketing',
		label: 'Marketing',
		description:
			'Used to track visitors across websites for personalized advertising and campaign attribution.',
	},
	{
		key: 'preferences',
		label: 'Preferences',
		description:
			'Remember your settings like theme, language, and sidebar state for a better experience.',
	},
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CookieConsentBanner({
	consent,
}: {
	consent: CookieConsentPreferences | null
}) {
	const fetcher = useFetcher()
	const [showPreferences, setShowPreferences] = useState(false)
	const [showSettingsButton, setShowSettingsButton] = useState(!!consent)

	// Local toggle state for the preferences panel.
	const [analytics, setAnalytics] = useState(consent?.analytics ?? false)
	const [marketing, setMarketing] = useState(consent?.marketing ?? false)
	const [preferences, setPreferences] = useState(consent?.preferences ?? false)

	// Hide the banner once the fetcher has submitted.
	const isSubmitting = fetcher.state !== 'idle'
	const hasSubmitted = fetcher.data != null

	// --- Quick actions via fetcher ------------------------------------------

	function acceptAll() {
		void fetcher.submit(
			{ intent: 'accept-all' },
			{ method: 'POST', action: '/resources/cookie-consent' },
		)
		setShowSettingsButton(true)
	}

	function rejectAll() {
		void fetcher.submit(
			{ intent: 'reject-all' },
			{ method: 'POST', action: '/resources/cookie-consent' },
		)
		setShowSettingsButton(true)
	}

	function savePreferences() {
		void fetcher.submit(
			{
				intent: 'save-preferences',
				analytics: String(analytics),
				marketing: String(marketing),
				preferences: String(preferences),
			},
			{ method: 'POST', action: '/resources/cookie-consent' },
		)
		setShowPreferences(false)
		setShowSettingsButton(true)
	}

	// --- Render: small "Cookie Settings" floating button --------------------

	if ((consent && !showPreferences) || (hasSubmitted && !showPreferences)) {
		if (!showSettingsButton) return null

		return (
			<button
				type="button"
				onClick={() => {
					setShowPreferences(true)
				}}
				className="fixed bottom-4 left-4 z-[100] rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Open cookie preferences"
			>
				<Trans>Cookie Settings</Trans>
			</button>
		)
	}

	// --- Render: preferences detail panel -----------------------------------

	if (showPreferences) {
		return (
			<div className="fixed bottom-0 left-0 z-[100] box-border p-5">
				<div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
					<div className="p-5">
						<h3 className="text-balance text-sm font-semibold text-foreground">
							<Trans>Cookie Preferences</Trans>
						</h3>
						<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
							<Trans>
								Choose which cookies you allow. You can change these settings at
								any time.
							</Trans>{' '}
							<a
								href="/legal/cookie-policy/"
								target="_blank"
								rel="noreferrer"
								className="text-primary underline underline-offset-2"
							>
								<Trans>Cookie Policy</Trans>
							</a>
						</p>

						<div className="mt-4 flex flex-col gap-3">
							{CATEGORIES.map((cat) => {
								const checked =
									cat.key === 'necessary'
										? true
										: cat.key === 'analytics'
											? analytics
											: cat.key === 'marketing'
												? marketing
												: preferences

								const onCheckedChange =
									cat.key === 'analytics'
										? setAnalytics
										: cat.key === 'marketing'
											? setMarketing
											: cat.key === 'preferences'
												? setPreferences
												: undefined

								return (
									<div
										key={cat.key}
										className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
									>
										<div className="flex-1">
											<p className="text-sm font-medium text-foreground">
												{cat.label}
											</p>
											<p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
												{cat.description}
											</p>
										</div>
										<Switch
											checked={checked}
											onCheckedChange={onCheckedChange}
											disabled={cat.locked}
											size="sm"
											aria-label={`Toggle ${cat.label} cookies`}
										/>
									</div>
								)
							})}
						</div>

						<div className="mt-4 flex flex-col gap-2">
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="flex-1"
									onClick={rejectAll}
									disabled={isSubmitting}
								>
									<Trans>Reject All</Trans>
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="flex-1"
									onClick={acceptAll}
									disabled={isSubmitting}
								>
									<Trans>Accept All</Trans>
								</Button>
							</div>
							<Button
								type="button"
								size="sm"
								className="w-full"
								onClick={savePreferences}
								disabled={isSubmitting}
							>
								<Trans>Save Preferences</Trans>
							</Button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// --- Render: initial consent banner (no consent yet) --------------------

	return (
		<div className="fixed bottom-0 left-0 z-[100] box-border p-5">
			<div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
				<div className="p-5">
					<p className="text-sm leading-relaxed text-foreground">
						<Trans>
							We use cookies to enhance your experience, analyze site traffic
							and deliver personalized content.
						</Trans>{' '}
						<a
							href="/legal/cookie-policy/"
							target="_blank"
							rel="noreferrer"
							className="text-primary underline underline-offset-2"
						>
							<Trans>Read our Cookie Policy</Trans>
						</a>
						.
					</p>
					<div className="mt-4 flex flex-col gap-2">
						<div className="flex gap-2">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="flex-1"
								onClick={rejectAll}
								disabled={isSubmitting}
							>
								<Trans>Reject All</Trans>
							</Button>
							<Button
								type="button"
								size="sm"
								className="flex-1"
								onClick={acceptAll}
								disabled={isSubmitting}
							>
								<Trans>Accept All</Trans>
							</Button>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full text-muted-foreground"
							onClick={() => setShowPreferences(true)}
							disabled={isSubmitting}
						>
							<Trans>Manage Preferences</Trans>
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
