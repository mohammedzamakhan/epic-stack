import { msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import {
	DEFAULT_SITE_THEME,
	SITE_BASE_COLORS,
	SITE_THEME_COLORS,
	SITE_THEME_MODES,
	SITE_THEME_RADII,
	SITE_THEME_RADIUS_VALUES,
	getBaseColorMeta,
	getThemeColorMeta,
	resolveSiteThemeTokens,
	type SiteBaseColor,
	type SiteThemeColor,
	type SiteThemeConfig,
	type SiteThemeMode,
	type SiteThemeRadius,
} from '@repo/common/site-theme'
import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'

export const SiteThemeSchema = z.object({
	baseColor: z.enum(SITE_BASE_COLORS),
	theme: z.enum(SITE_THEME_COLORS),
	radius: z.enum(SITE_THEME_RADII),
	mode: z.enum(SITE_THEME_MODES),
	organizationId: z.string(),
})

export const siteThemeActionIntent = 'update-site-theme'

const ACCENT_NEUTRALS = SITE_THEME_COLORS.filter((c) =>
	(SITE_BASE_COLORS as readonly string[]).includes(c),
)
const ACCENT_COLORS = SITE_THEME_COLORS.filter(
	(c) => !(SITE_BASE_COLORS as readonly string[]).includes(c),
)

function FieldLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-foreground mb-2 text-sm font-medium tracking-tight">
			{children}
		</p>
	)
}

function ColorSwatch({
	label,
	swatch,
	selected,
	disabled,
	onSelect,
}: {
	label: string
	swatch: string
	selected: boolean
	disabled?: boolean
	onSelect: () => void
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onSelect}
			title={label}
			aria-label={label}
			aria-pressed={selected}
			className={cn(
				'size-6 rounded-full transition-[box-shadow,transform] duration-150 ease-out',
				'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
				'disabled:pointer-events-none disabled:opacity-50',
				selected
					? 'ring-foreground ring-offset-background scale-105 ring-2 ring-offset-2'
					: 'hover:ring-foreground/30 hover:ring-offset-background hover:ring-2 hover:ring-offset-2',
			)}
			style={{ backgroundColor: swatch }}
		/>
	)
}

function RadiusGlyph({
	radius,
	selected,
}: {
	radius: SiteThemeRadius
	selected: boolean
}) {
	const value = SITE_THEME_RADIUS_VALUES[radius]
	return (
		<span
			className={cn(
				'relative size-8 overflow-hidden border',
				selected
					? 'border-foreground/25 bg-muted/40'
					: 'border-border bg-muted/20',
			)}
			style={{ borderRadius: value || '0' }}
			aria-hidden
		>
			<span
				className={cn(
					'absolute inset-1.5 border-t-2 border-l-2',
					selected ? 'border-primary' : 'border-muted-foreground/50',
				)}
				style={{
					borderTopLeftRadius: value || '0',
					borderTopRightRadius: 0,
					borderBottomLeftRadius: 0,
					borderBottomRightRadius: 0,
				}}
			/>
		</span>
	)
}

export function SiteThemeCard({
	organization,
	themeConfig,
}: {
	organization: { id: string }
	themeConfig: SiteThemeConfig
	actionData?: { result?: unknown }
}) {
	const { _ } = useLingui()
	const themeFetcher = useFetcher()
	const ThemeForm = themeFetcher.Form
	const busy = themeFetcher.state !== 'idle'

	const [selectedBase, setSelectedBase] = useState<SiteBaseColor>(
		themeConfig.baseColor || DEFAULT_SITE_THEME.baseColor,
	)
	const [selectedTheme, setSelectedTheme] = useState<SiteThemeColor>(
		themeConfig.theme || DEFAULT_SITE_THEME.theme,
	)
	const [selectedRadius, setSelectedRadius] = useState<SiteThemeRadius>(
		themeConfig.radius || DEFAULT_SITE_THEME.radius,
	)
	const [selectedMode, setSelectedMode] = useState<SiteThemeMode>(
		themeConfig.mode || DEFAULT_SITE_THEME.mode,
	)
	const [systemPrefersDark, setSystemPrefersDark] = useState(false)

	useEffect(() => {
		const media = window.matchMedia('(prefers-color-scheme: dark)')
		const sync = () => setSystemPrefersDark(media.matches)
		sync()
		media.addEventListener('change', sync)
		return () => media.removeEventListener('change', sync)
	}, [])

	const modeLabels: Record<SiteThemeMode, string> = {
		light: _(msg`Light`),
		dark: _(msg`Dark`),
		system: _(msg`System`),
	}

	const modeIcons = {
		light: 'sun',
		dark: 'moon',
		system: 'laptop',
	} as const

	const radiusLabels: Record<SiteThemeRadius, string> = {
		default: _(msg`Medium`),
		none: _(msg`None`),
		small: _(msg`Small`),
		medium: _(msg`Medium`),
		large: _(msg`Large`),
	}

	/** Prefer Radix-like order: None → Small → Medium → Large (skip duplicate default). */
	const radiusOptions = SITE_THEME_RADII.filter((r) => r !== 'default')

	const previewIsDark =
		selectedMode === 'dark' || (selectedMode === 'system' && systemPrefersDark)

	const resolved = resolveSiteThemeTokens({
		baseColor: selectedBase,
		theme: selectedTheme,
		radius: selectedRadius,
		mode: selectedMode,
	})
	const previewTokens = previewIsDark ? resolved.dark : resolved.light

	const baseMeta = getBaseColorMeta(selectedBase)
	const themeMeta = getThemeColorMeta(selectedTheme)
	const previewRadius = SITE_THEME_RADIUS_VALUES[selectedRadius]

	return (
		<Card>
			<CardHeader className="border-border gap-2 border-b px-5 pb-5 sm:px-6">
				<CardTitle>{_(msg`Branding`)}</CardTitle>
				<CardDescription>
					{_(
						msg`Set the look of your public website. Save when you’re happy with the preview.`,
					)}
				</CardDescription>
			</CardHeader>

			<ThemeForm method="POST">
				<input type="hidden" name="intent" value={siteThemeActionIntent} />
				<input type="hidden" name="organizationId" value={organization.id} />
				<input type="hidden" name="baseColor" value={selectedBase} />
				<input type="hidden" name="theme" value={selectedTheme} />
				<input type="hidden" name="radius" value={selectedRadius} />
				<input type="hidden" name="mode" value={selectedMode} />

				<CardContent className="px-5 pt-2 pb-6 sm:px-6">
					<div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12">
						{/* Preview in browser chrome */}
						<div className="lg:sticky lg:top-6">
							<div className="border-border bg-muted/50 overflow-hidden rounded-2xl border shadow-sm">
								{/* Browser chrome */}
								<div className="grid grid-cols-[1fr_minmax(0,11rem)_1fr] items-center gap-2 px-3 py-2.5 sm:grid-cols-[1fr_minmax(0,14rem)_1fr]">
									<div className="flex items-center gap-1.5" aria-hidden>
										<span className="size-2.5 rounded-full bg-[#ff5f57]" />
										<span className="size-2.5 rounded-full bg-[#febc2e]" />
										<span className="size-2.5 rounded-full bg-[#28c840]" />
									</div>
									<div className="flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11px]">
										<Icon name="lock" className="size-3 shrink-0 opacity-70" />
										<span className="truncate font-medium tracking-tight">
											acme.example.com
										</span>
									</div>
									<div
										className="text-muted-foreground flex items-center justify-end gap-2.5"
										aria-hidden
									>
										<Icon name="share-2" className="size-3.5 opacity-70" />
										<Icon name="plus" className="size-3.5 opacity-70" />
										<Icon name="copy" className="size-3.5 opacity-70" />
									</div>
								</div>

								{/* Inset site viewport */}
								<div className="px-2 pb-2">
									<div
										className="overflow-hidden rounded-xl transition-[background-color,color] duration-200 ease-out"
										style={{
											backgroundColor: previewTokens['--background'],
											color: previewTokens['--foreground'],
										}}
									>
										<div
											className="flex items-center gap-2.5 border-b px-5 py-3.5"
											style={{ borderColor: previewTokens['--border'] }}
										>
											<span
												className="size-7 shrink-0"
												style={{
													backgroundColor: previewTokens['--primary'],
													borderRadius: previewRadius,
												}}
											/>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium tracking-tight">
													{_(msg`Acme Site`)}
												</p>
												<p
													className="truncate text-xs"
													style={{
														color: previewTokens['--muted-foreground'],
													}}
												>
													{baseMeta.label} · {themeMeta.label}
												</p>
											</div>
										</div>

										<div className="space-y-6 px-5 py-7 sm:px-6 sm:py-8">
											<div className="space-y-2.5">
												<p className="text-2xl leading-tight font-semibold tracking-tight">
													{_(msg`Welcome to your site`)}
												</p>
												<p
													className="max-w-[28ch] text-sm leading-relaxed"
													style={{
														color: previewTokens['--muted-foreground'],
													}}
												>
													{_(
														msg`This is how visitors experience your brand online.`,
													)}
												</p>
											</div>

											<div className="flex flex-wrap items-center gap-2.5">
												<span
													className="inline-flex items-center px-3.5 py-2 text-sm font-medium"
													style={{
														backgroundColor: previewTokens['--primary'],
														color: previewTokens['--primary-foreground'],
														borderRadius: previewRadius,
													}}
												>
													{_(msg`Get started`)}
												</span>
												<span
													className="inline-flex items-center border px-3.5 py-2 text-sm"
													style={{
														backgroundColor: previewTokens['--secondary'],
														color: previewTokens['--secondary-foreground'],
														borderColor: previewTokens['--border'],
														borderRadius: previewRadius,
													}}
												>
													{_(msg`Learn more`)}
												</span>
											</div>

											<div
												className="space-y-3.5 border p-4 sm:p-5"
												style={{
													borderColor: previewTokens['--border'],
													backgroundColor: previewTokens['--card'],
													color: previewTokens['--card-foreground'],
													borderRadius: previewRadius,
												}}
											>
												<p className="text-sm font-medium tracking-tight">
													{_(msg`Featured`)}
												</p>
												<p
													className="text-sm leading-relaxed"
													style={{
														color: previewTokens['--muted-foreground'],
													}}
												>
													{_(
														msg`Cards, borders, and text follow your palette choices.`,
													)}
												</p>
												<div className="flex gap-1.5 pt-1">
													{[1, 2, 3, 4, 5].map((n) => (
														<span
															key={n}
															className="h-1.5 flex-1"
															style={{
																backgroundColor: previewTokens[`--chart-${n}`],
																borderRadius: `max(2px, calc(${previewRadius} * 0.5))`,
															}}
														/>
													))}
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Controls — compact Radix-style */}
						<div className="flex flex-col gap-5">
							<section>
								<FieldLabel>{_(msg`Accent color`)}</FieldLabel>
								<div className="space-y-2">
									<div className="flex flex-wrap gap-2">
										{ACCENT_NEUTRALS.map((themeColor) => {
											const meta = getThemeColorMeta(themeColor)
											return (
												<ColorSwatch
													key={themeColor}
													label={meta.label}
													swatch={meta.swatch}
													selected={selectedTheme === themeColor}
													disabled={busy}
													onSelect={() => setSelectedTheme(themeColor)}
												/>
											)
										})}
									</div>
									<div className="flex flex-wrap gap-2">
										{ACCENT_COLORS.map((themeColor) => {
											const meta = getThemeColorMeta(themeColor)
											return (
												<ColorSwatch
													key={themeColor}
													label={meta.label}
													swatch={meta.swatch}
													selected={selectedTheme === themeColor}
													disabled={busy}
													onSelect={() => setSelectedTheme(themeColor)}
												/>
											)
										})}
									</div>
								</div>
							</section>

							<section>
								<FieldLabel>{_(msg`Gray color`)}</FieldLabel>
								<div className="flex flex-wrap gap-2">
									{SITE_BASE_COLORS.map((baseColor) => {
										const meta = getBaseColorMeta(baseColor)
										return (
											<ColorSwatch
												key={baseColor}
												label={meta.label}
												swatch={meta.swatch}
												selected={selectedBase === baseColor}
												disabled={busy}
												onSelect={() => setSelectedBase(baseColor)}
											/>
										)
									})}
								</div>
							</section>

							<section>
								<FieldLabel>{_(msg`Appearance`)}</FieldLabel>
								<div className="grid grid-cols-3 gap-1.5">
									{SITE_THEME_MODES.map((mode) => {
										const isSelected = selectedMode === mode
										return (
											<button
												key={mode}
												type="button"
												disabled={busy}
												onClick={() => setSelectedMode(mode)}
												aria-pressed={isSelected}
												className={cn(
													'border-border flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition-colors',
													'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
													isSelected
														? 'border-foreground bg-background ring-foreground/10 ring-1'
														: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
												)}
											>
												<Icon
													name={modeIcons[mode]}
													className="size-3.5 shrink-0"
												/>
												{modeLabels[mode]}
											</button>
										)
									})}
								</div>
							</section>

							<section>
								<FieldLabel>{_(msg`Radius`)}</FieldLabel>
								<div className="grid grid-cols-4 gap-1.5">
									{radiusOptions.map((radius) => {
										const isSelected =
											selectedRadius === radius ||
											(radius === 'medium' && selectedRadius === 'default')
										return (
											<button
												key={radius}
												type="button"
												disabled={busy}
												onClick={() => setSelectedRadius(radius)}
												aria-pressed={isSelected}
												className={cn(
													'border-border flex flex-col items-center gap-1.5 rounded-md border px-1.5 py-2 transition-colors',
													'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
													isSelected
														? 'border-foreground bg-background ring-foreground/10 ring-1'
														: 'hover:bg-muted/50',
												)}
											>
												<RadiusGlyph radius={radius} selected={isSelected} />
												<span
													className={cn(
														'text-[10px] font-medium',
														isSelected
															? 'text-foreground'
															: 'text-muted-foreground',
													)}
												>
													{radiusLabels[radius]}
												</span>
											</button>
										)
									})}
								</div>
							</section>
						</div>
					</div>
				</CardContent>

				<CardFooter className="justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
					<p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
						{_(
							msg`Preview updates as you choose. Nothing publishes until you save.`,
						)}
					</p>
					<Button type="submit" disabled={busy}>
						{_(msg`Save branding`)}
					</Button>
				</CardFooter>
			</ThemeForm>
		</Card>
	)
}
