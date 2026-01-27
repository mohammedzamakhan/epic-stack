import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { useState } from 'react'
import { useFetcher } from 'react-router'

import {
	generateBackupCodesActionIntent,
	regenerateBackupCodesActionIntent,
} from '#app/routes/_app+/security.tsx'

interface BackupCodesDisplayProps {
	backupCodesRemaining: number
	isTwoFactorEnabled: boolean
}

export function BackupCodesDisplay({
	backupCodesRemaining,
	isTwoFactorEnabled,
}: BackupCodesDisplayProps) {
	const fetcher = useFetcher<{ status: string; codes?: string[] }>()
	const [showCodes, setShowCodes] = useState(false)

	if (!isTwoFactorEnabled) return null

	const codes = fetcher.data?.codes
	const isGenerating = fetcher.state !== 'idle'

	const handleCopyAll = () => {
		if (codes) {
			void navigator.clipboard.writeText(codes.join('\n'))
		}
	}

	const handleDownload = () => {
		if (codes) {
			const content = `# 2FA Backup Codes\n# Keep these codes safe. Each can only be used once.\n\n${codes.join('\n')}`
			const blob = new Blob([content], { type: 'text/plain' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'backup-codes.txt'
			a.click()
			URL.revokeObjectURL(url)
		}
	}

	// Show generated codes
	if (codes && showCodes) {
		return (
			<div className="space-y-4">
				<div className="bg-destructive/10 text-destructive rounded-lg p-4">
					<div className="flex items-start gap-3">
						<Icon name="alert-triangle" className="h-5 w-5 shrink-0" />
						<div className="text-sm">
							<p className="font-medium">
								<Trans>Save these codes now!</Trans>
							</p>
							<p className="mt-1">
								<Trans>
									These codes will not be shown again. Store them in a secure
									location like a password manager.
								</Trans>
							</p>
						</div>
					</div>
				</div>

				<div className="bg-muted rounded-lg p-4">
					<div className="grid grid-cols-2 gap-2 font-mono text-sm">
						{codes.map((code, index) => (
							<div
								key={code}
								className="bg-background rounded px-3 py-2 text-center"
							>
								{index + 1}. {code}
							</div>
						))}
					</div>
				</div>

				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleCopyAll}
					>
						<Icon name="copy" className="mr-2 h-4 w-4" />
						<Trans>Copy All</Trans>
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleDownload}
					>
						<Icon name="download" className="mr-2 h-4 w-4" />
						<Trans>Download</Trans>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setShowCodes(false)}
						className="ml-auto"
					>
						<Trans>Done</Trans>
					</Button>
				</div>
			</div>
		)
	}

	// Show status and generate/regenerate buttons
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium">
						<Trans>Backup codes</Trans>
					</p>
					<p className="text-muted-foreground text-sm">
						{backupCodesRemaining > 0 ? (
							<Trans>{backupCodesRemaining} unused codes remaining</Trans>
						) : (
							<Trans>No backup codes generated</Trans>
						)}
					</p>
				</div>
			</div>

			<fetcher.Form method="POST">
				{backupCodesRemaining > 0 ? (
					<>
						<input
							type="hidden"
							name="intent"
							value={regenerateBackupCodesActionIntent}
						/>
						<Button
							type="submit"
							variant="outline"
							size="sm"
							disabled={isGenerating}
							onClick={() => setShowCodes(true)}
						>
							{isGenerating ? (
								<Trans>Generating...</Trans>
							) : (
								<Trans>Regenerate Codes</Trans>
							)}
						</Button>
					</>
				) : (
					<>
						<input
							type="hidden"
							name="intent"
							value={generateBackupCodesActionIntent}
						/>
						<Button
							type="submit"
							variant="outline"
							size="sm"
							disabled={isGenerating}
							onClick={() => setShowCodes(true)}
						>
							{isGenerating ? (
								<Trans>Generating...</Trans>
							) : (
								<Trans>Generate Backup Codes</Trans>
							)}
						</Button>
					</>
				)}
			</fetcher.Form>
		</div>
	)
}
