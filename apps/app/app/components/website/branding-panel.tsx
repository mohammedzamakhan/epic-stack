import { Trans } from '@lingui/macro'
import {
	DEFAULT_SITE_THEME,
	type SiteThemeConfig,
} from '@repo/common/site-theme'
import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { ScrollArea } from '@repo/ui/scroll-area'
import { Spinner } from '@repo/ui/spinner'
import { Img } from 'openimg/react'
import { useEffect, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import {
	deleteSiteIconActionIntent,
	uploadSiteIconActionIntent,
} from '#app/components/settings/cards/organization/site-icon-card.tsx'
import {
	SiteThemeFields,
	deleteSiteFontActionIntent,
	siteThemeActionIntent,
	uploadSiteFontActionIntent,
} from '#app/components/settings/cards/organization/site-theme-card.tsx'

const MAX_ICON_SIZE = 1024 * 1024 * 5

export function BrandingPanel({
	organization,
	themeConfig,
	onPreviewRefresh,
}: {
	organization: {
		id: string
		siteIconKey: string | null
		siteIconAssets: Array<{ type: string; status: string }>
	}
	themeConfig: SiteThemeConfig
	onPreviewRefresh: () => void
}) {
	const themeFetcher = useFetcher<{ status?: string; error?: string }>()
	const iconFetcher = useFetcher<{ status?: string; error?: string }>()
	const fontFetcher = useFetcher<{ status?: string; error?: string }>()
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [theme, setTheme] = useState<SiteThemeConfig>(() => ({
		...DEFAULT_SITE_THEME,
		...themeConfig,
	}))
	const [localPreview, setLocalPreview] = useState<string | null>(null)
	const [iconError, setIconError] = useState<string | null>(null)
	const lastThemeRefresh = useRef(false)
	const lastIconRefresh = useRef(false)
	const lastFontRefresh = useRef(false)
	const [fontError, setFontError] = useState<string | null>(null)
	const [uploadingRole, setUploadingRole] = useState<'heading' | 'body' | null>(
		null,
	)

	useEffect(() => {
		setTheme({ ...DEFAULT_SITE_THEME, ...themeConfig })
	}, [themeConfig])

	useEffect(() => {
		if (themeFetcher.state !== 'idle') {
			lastThemeRefresh.current = true
			return
		}
		if (lastThemeRefresh.current && themeFetcher.data?.status === 'success') {
			lastThemeRefresh.current = false
			onPreviewRefresh()
		}
	}, [themeFetcher.state, themeFetcher.data, onPreviewRefresh])

	useEffect(() => {
		if (iconFetcher.state !== 'idle') {
			lastIconRefresh.current = true
			return
		}
		if (lastIconRefresh.current && iconFetcher.data?.status === 'success') {
			lastIconRefresh.current = false
			setLocalPreview(null)
			if (fileInputRef.current) fileInputRef.current.value = ''
			onPreviewRefresh()
		}
	}, [iconFetcher.state, iconFetcher.data, onPreviewRefresh])

	useEffect(() => {
		if (fontFetcher.state !== 'idle') {
			lastFontRefresh.current = true
			return
		}
		if (lastFontRefresh.current) {
			lastFontRefresh.current = false
			setUploadingRole(null)
			if (fontFetcher.data?.status === 'success') {
				setFontError(null)
				onPreviewRefresh()
			}
		}
	}, [fontFetcher.state, fontFetcher.data, onPreviewRefresh])

	const busyTheme = themeFetcher.state !== 'idle'
	const busyIcon = iconFetcher.state !== 'idle'
	const busyFont = fontFetcher.state !== 'idle'
	const hasProcessingAssets = organization.siteIconAssets.some(
		(asset) => asset.status === 'processing',
	)
	const hasCompletedAssets = organization.siteIconAssets.some(
		(asset) => asset.status === 'completed',
	)
	const imgSrc = organization.siteIconKey
		? `/resources/images?objectKey=${encodeURIComponent(organization.siteIconKey)}`
		: ''
	const uploadError =
		iconError ||
		(iconFetcher.data?.status === 'error'
			? (iconFetcher.data.error ?? null)
			: null)

	const persistTheme = (next: SiteThemeConfig) => {
		if (typeof document !== 'undefined') {
			try {
				const encoded = encodeURIComponent(JSON.stringify(next))
				document.cookie = `epic_preview_theme=${encoded}; path=/; max-age=86400; SameSite=Lax`
			} catch {}
		}
		setTheme(next)
		void themeFetcher.submit(
			{
				intent: siteThemeActionIntent,
				organizationId: organization.id,
				baseColor: next.baseColor,
				theme: next.theme,
				radius: next.radius,
				mode: next.mode,
				headingFont: next.headingFont,
				bodyFont: next.bodyFont,
			},
			{ method: 'POST' },
		)
	}

	const handleUploadFont = (role: 'heading' | 'body', file: File) => {
		setFontError(null)
		setUploadingRole(role)
		const formData = new FormData()
		formData.append('intent', uploadSiteFontActionIntent)
		formData.append('organizationId', organization.id)
		formData.append('role', role)
		formData.append('fontFile', file)
		void fontFetcher.submit(formData, {
			method: 'POST',
			encType: 'multipart/form-data',
		})
	}

	const handleRemoveFont = (role: 'heading' | 'body') => {
		setFontError(null)
		void fontFetcher.submit(
			{
				intent: deleteSiteFontActionIntent,
				organizationId: organization.id,
				role,
			},
			{ method: 'POST' },
		)
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		if (!file) return

		if (file.type !== 'image/png') {
			setIconError('Only PNG images are accepted')
			return
		}
		if (file.size > MAX_ICON_SIZE) {
			setIconError('Image size must be less than 5MB')
			return
		}

		setIconError(null)
		const reader = new FileReader()
		reader.onload = (loadEvent) => {
			if (typeof loadEvent.target?.result === 'string') {
				setLocalPreview(loadEvent.target.result)
			}
		}
		reader.readAsDataURL(file)

		const formData = new FormData()
		formData.append('intent', uploadSiteIconActionIntent)
		formData.append('organizationId', organization.id)
		formData.append('iconFile', file)
		void iconFetcher.submit(formData, {
			method: 'POST',
			encType: 'multipart/form-data',
		})
	}

	const handleDelete = () => {
		setLocalPreview(null)
		setIconError(null)
		void iconFetcher.submit(
			{
				intent: deleteSiteIconActionIntent,
				organizationId: organization.id,
			},
			{ method: 'POST' },
		)
	}

	const displaySrc = localPreview || imgSrc
	const hasLogo = Boolean(displaySrc) || hasCompletedAssets

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-border flex items-center gap-2 border-b px-3 py-2.5">
				<span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-md">
					<Icon name="paintbrush" className="size-3.5" />
				</span>
				<span className="min-w-0 flex-1 truncate text-sm font-medium">
					<Trans>Branding</Trans>
				</span>
				{busyTheme || busyIcon || busyFont || hasProcessingAssets ? (
					<Spinner className="size-3.5" />
				) : null}
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-6 p-4">
					<p className="text-muted-foreground text-xs leading-relaxed">
						<Trans>
							Logo, fonts, colors, and corners apply to every page. The preview
							updates as you change them.
						</Trans>
					</p>

					<div className="space-y-2">
						<p className="text-muted-foreground text-xs font-medium">
							<Trans>Logo</Trans>
						</p>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/png"
							className="sr-only"
							onChange={handleFileSelect}
						/>
						{hasLogo ? (
							<div className="flex items-center gap-3">
								<div className="border-border bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
									{localPreview ? (
										<img
											src={localPreview}
											alt=""
											className="size-full object-contain"
										/>
									) : imgSrc ? (
										<Img
											src={imgSrc}
											alt=""
											width={96}
											height={96}
											className="size-full object-contain"
										/>
									) : (
										<Icon
											name="image"
											className="text-muted-foreground size-4"
										/>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap gap-1.5">
										<Button
											type="button"
											variant="outline"
											size="xs"
											disabled={busyIcon}
											onClick={() => fileInputRef.current?.click()}
										>
											<Trans>Change</Trans>
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="xs"
											className="text-destructive hover:text-destructive"
											disabled={busyIcon}
											onClick={handleDelete}
										>
											<Trans>Remove</Trans>
										</Button>
									</div>
									<p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">
										<Trans>PNG, up to 5 MB. Used as logo and favicon.</Trans>
									</p>
								</div>
							</div>
						) : (
							<button
								type="button"
								disabled={busyIcon}
								onClick={() => fileInputRef.current?.click()}
								className={cn(
									'border-border hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-left transition-colors',
									'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
									'disabled:pointer-events-none disabled:opacity-50',
								)}
							>
								<span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
									<Icon name="image" className="size-4" />
								</span>
								<span>
									<span className="block text-sm font-medium">
										<Trans>Upload a logo</Trans>
									</span>
									<span className="text-muted-foreground mt-0.5 block text-[11px] leading-relaxed">
										<Trans>PNG, up to 5 MB. Recommended 512×512.</Trans>
									</span>
								</span>
							</button>
						)}
						{hasProcessingAssets ? (
							<p className="text-muted-foreground flex items-center gap-2 text-[11px]">
								<Icon name="loader" className="size-3.5 animate-spin" />
								<Trans>Generating favicon variants…</Trans>
							</p>
						) : null}
						{uploadError ? (
							<p className="text-destructive text-xs" role="alert">
								{uploadError}
							</p>
						) : null}
					</div>

					<SiteThemeFields
						value={theme}
						disabled={busyTheme || busyFont}
						onChange={persistTheme}
						onUploadFont={handleUploadFont}
						onRemoveFont={handleRemoveFont}
						onFontError={setFontError}
						uploadingRole={busyFont ? uploadingRole : null}
					/>
					{fontError || fontFetcher.data?.status === 'error' ? (
						<p className="text-destructive text-xs" role="alert">
							{fontError || fontFetcher.data?.error}
						</p>
					) : null}
				</div>
			</ScrollArea>
		</div>
	)
}
