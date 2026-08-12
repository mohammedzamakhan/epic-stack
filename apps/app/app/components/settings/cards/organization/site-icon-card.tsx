import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Img } from 'openimg/react'
import { useId, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'

export const uploadSiteIconActionIntent = 'upload-site-icon'
export const deleteSiteIconActionIntent = 'delete-site-icon'

const MAX_SIZE = 1024 * 1024 * 5 // 5MB

export const SiteIconSchema = z.object({
	iconFile: z
		.instanceof(File)
		.refine((file) => file.size > 0, 'Image is required')
		.refine((file) => file.size <= MAX_SIZE, 'Image size must be less than 5MB')
		.refine(
			(file) => file.type === 'image/png',
			'Only PNG images are accepted',
		),
})

export function SiteIconCard({
	organization,
}: {
	organization: {
		id: string
		siteIconKey: string | null
		siteIconAssets: Array<{ type: string; status: string }>
	}
}) {
	const fetcher = useFetcher()
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [previewSrc, setPreviewSrc] = useState<string | null>(null)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)

	const fileInputId = useId()

	const siteIconKey = organization.siteIconKey
	const hasCompletedAssets = organization.siteIconAssets.some(
		(a) => a.status === 'completed',
	)
	const hasProcessingAssets = organization.siteIconAssets.some(
		(a) => a.status === 'processing',
	)

	const imgSrc = siteIconKey
		? `/resources/images?objectKey=${encodeURIComponent(siteIconKey)}`
		: ''

	const busy = fetcher.state !== 'idle' || hasProcessingAssets

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.currentTarget.files?.[0]
		if (file) {
			setSelectedFile(file)
			const reader = new FileReader()
			reader.onload = (event) => {
				if (event.target?.result) {
					setPreviewSrc(event.target.result as string)
				}
			}
			reader.readAsDataURL(file)
		}
	}

	const handleUpload = () => {
		if (!selectedFile) return

		const formData = new FormData()
		formData.append('intent', uploadSiteIconActionIntent)
		formData.append('organizationId', organization.id)
		formData.append('iconFile', selectedFile)

		void fetcher.submit(formData, {
			method: 'POST',
			encType: 'multipart/form-data',
		})

		setSelectedFile(null)
		setPreviewSrc(null)
	}

	const handleCancel = () => {
		setSelectedFile(null)
		setPreviewSrc(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const handleDelete = () => {
		void fetcher.submit(
			{
				intent: deleteSiteIconActionIntent,
				organizationId: organization.id,
			},
			{ method: 'POST' },
		)
	}

	const isUploadSuccess = fetcher.data?.status === 'success'

	if (isUploadSuccess && fileInputRef.current) {
		fileInputRef.current.value = ''
	}

	const fileInput = (
		<input
			id={fileInputId}
			ref={fileInputRef}
			type="file"
			accept="image/png,image/avif"
			className="sr-only"
			onChange={handleFileSelect}
		/>
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Trans>Site icon</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Upload a PNG icon for your public website. We&apos;ll automatically
						generate favicon and app icon variants.
					</Trans>
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-5">
				{fileInput}

				{previewSrc ? (
					<div className="space-y-4">
						<div className="bg-muted flex items-center gap-4 rounded-xl p-4">
							<div className="border-border bg-background ring-border/10 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-xs ring-1">
								<img
									src={previewSrc}
									alt="Preview"
									className="size-full object-contain"
								/>
							</div>
							<div>
								<p className="text-sm font-medium">
									<Trans>New icon preview</Trans>
								</p>
								<p className="text-muted-foreground text-xs">
									{selectedFile?.name}{' '}
									{selectedFile
										? `(${(selectedFile.size / 1024).toFixed(0)} KB)`
										: ''}
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<Button
								type="button"
								size="sm"
								onClick={handleUpload}
								disabled={busy}
							>
								<Icon name="check" className="mr-1.5 size-3.5" />
								<Trans>Confirm upload</Trans>
							</Button>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleCancel}
								disabled={busy}
							>
								<Trans>Cancel</Trans>
							</Button>
						</div>
					</div>
				) : imgSrc || hasCompletedAssets ? (
					<div className="bg-muted flex items-center gap-5 rounded-xl p-4">
						<div className="border-border bg-background ring-border/10 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-xs ring-1">
							<Img
								src={imgSrc}
								alt="Site icon"
								className="size-full object-contain"
								width={128}
								height={128}
							/>
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium">
								<Trans>Current icon</Trans>
							</p>
							<p className="text-muted-foreground mb-3 text-xs">
								<Trans>Favicon and app icon variants generated.</Trans>
							</p>
							<div className="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={busy}
									onClick={() => fileInputRef.current?.click()}
								>
									<Icon name="image" className="mr-1.5 size-3.5" />
									<Trans>Change</Trans>
								</Button>
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={handleDelete}
									disabled={busy}
								>
									<Trans>Remove</Trans>
								</Button>
							</div>
						</div>
					</div>
				) : (
					<label
						htmlFor={fileInputId}
						className="border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors"
					>
						<div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
							<Icon name="image" className="size-5" />
						</div>
						<div>
							<p className="text-sm font-medium">
								<Trans>Upload a site icon</Trans>
							</p>
							<p className="text-muted-foreground mt-1 text-xs">
								<Trans>PNG only, up to 5 MB. Recommended size: 512×512.</Trans>
							</p>
						</div>
					</label>
				)}

				{hasProcessingAssets ? (
					<div className="bg-muted flex items-center gap-2.5 rounded-lg px-4 py-3 text-sm">
						<Icon
							name="loader"
							className="text-muted-foreground size-4 shrink-0 animate-spin"
						/>
						<p className="text-muted-foreground text-xs">
							<Trans>Generating icon variants. This may take a moment.</Trans>
						</p>
					</div>
				) : null}
			</CardContent>
		</Card>
	)
}
