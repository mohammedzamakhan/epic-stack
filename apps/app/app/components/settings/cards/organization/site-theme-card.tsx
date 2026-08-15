import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import {
	CUSTOM_SITE_FONT_ID,
	SITE_BASE_COLORS,
	SITE_FONT_IDS,
	SITE_FONTS,
	SITE_THEME_COLORS,
	SITE_THEME_MODES,
	SITE_THEME_RADII,
	SITE_THEME_RADIUS_VALUES,
	getBaseColorMeta,
	getSiteFont,
	getThemeColorMeta,
	siteFontDisplayName,
	siteFontFormatFromExtension,
	type SiteFontSelection,
	type SiteThemeConfig,
	type SiteThemeMode,
	type SiteThemeRadius,
} from '@repo/common/site-theme'
import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/tooltip'
import { type ChangeEvent, useRef } from 'react'
import { z } from 'zod'

export const SiteThemeSchema = z.object({
	baseColor: z.enum(SITE_BASE_COLORS),
	theme: z.enum(SITE_THEME_COLORS),
	radius: z.enum(SITE_THEME_RADII),
	mode: z.enum(SITE_THEME_MODES),
	headingFont: z.union([z.enum(SITE_FONT_IDS), z.literal(CUSTOM_SITE_FONT_ID)]),
	bodyFont: z.union([z.enum(SITE_FONT_IDS), z.literal(CUSTOM_SITE_FONT_ID)]),
	organizationId: z.string(),
})

export const siteThemeActionIntent = 'update-site-theme'
export const uploadSiteFontActionIntent = 'upload-site-font'
export const deleteSiteFontActionIntent = 'delete-site-font'

const MAX_FONT_SIZE = 1024 * 1024 * 2
const FONT_ACCEPT = '.woff2,.woff,.ttf,.otf'

const ACCENT_NEUTRALS = SITE_THEME_COLORS.filter((c) =>
	(SITE_BASE_COLORS as readonly string[]).includes(c),
)
const ACCENT_COLORS = SITE_THEME_COLORS.filter(
	(c) => !(SITE_BASE_COLORS as readonly string[]).includes(c),
)

function FieldLabel({ children }: { children: React.ReactNode }) {
	return <p className="text-muted-foreground text-xs font-medium">{children}</p>
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
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						disabled={disabled}
						onClick={onSelect}
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
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
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
				'relative size-7 overflow-hidden border',
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

function FontSelect({
	id,
	value,
	customLabel,
	disabled,
	onChange,
}: {
	id: string
	value: SiteFontSelection
	customLabel?: string | null
	disabled?: boolean
	onChange: (next: SiteFontSelection) => void
}) {
	const selected =
		value === CUSTOM_SITE_FONT_ID
			? {
					family: customLabel || 'Custom',
					fallback: 'sans-serif' as const,
				}
			: getSiteFont(value)
	const sansFonts = SITE_FONTS.filter((font) => font.fallback === 'sans-serif')
	const serifFonts = SITE_FONTS.filter((font) => font.fallback === 'serif')
	const monoFonts = SITE_FONTS.filter((font) => font.fallback === 'monospace')

	return (
		<Select
			value={value}
			onValueChange={(next) => {
				if (next) onChange(next as SiteFontSelection)
			}}
			disabled={disabled}
		>
			<SelectTrigger id={id} className="w-full">
				<SelectValue>
					<span
						style={{ fontFamily: `"${selected.family}", ${selected.fallback}` }}
					>
						{selected.family}
					</span>
				</SelectValue>
			</SelectTrigger>
			<SelectContent align="start" alignItemWithTrigger={false}>
				{customLabel ? (
					<SelectGroup>
						<SelectLabel>
							<Trans>Uploaded</Trans>
						</SelectLabel>
						<SelectItem value={CUSTOM_SITE_FONT_ID}>{customLabel}</SelectItem>
					</SelectGroup>
				) : null}
				<SelectGroup>
					<SelectLabel>
						<Trans>Sans</Trans>
					</SelectLabel>
					{sansFonts.map((font) => (
						<SelectItem key={font.id} value={font.id}>
							<span
								style={{ fontFamily: `"${font.family}", ${font.fallback}` }}
							>
								{font.family}
							</span>
						</SelectItem>
					))}
				</SelectGroup>
				<SelectGroup>
					<SelectLabel>
						<Trans>Serif</Trans>
					</SelectLabel>
					{serifFonts.map((font) => (
						<SelectItem key={font.id} value={font.id}>
							<span
								style={{ fontFamily: `"${font.family}", ${font.fallback}` }}
							>
								{font.family}
							</span>
						</SelectItem>
					))}
				</SelectGroup>
				<SelectGroup>
					<SelectLabel>
						<Trans>Mono</Trans>
					</SelectLabel>
					{monoFonts.map((font) => (
						<SelectItem key={font.id} value={font.id}>
							<span
								style={{ fontFamily: `"${font.family}", ${font.fallback}` }}
							>
								{font.family}
							</span>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	)
}

function FontFileField({
	role,
	filename,
	disabled,
	onUpload,
	onRemove,
	onError,
}: {
	role: 'heading' | 'body'
	filename: string | null
	disabled?: boolean
	onUpload: (role: 'heading' | 'body', file: File) => void
	onRemove: (role: 'heading' | 'body') => void
	onError: (message: string) => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0]
		event.currentTarget.value = ''
		if (!file) return
		if (!siteFontFormatFromExtension(file.name)) {
			onError('Use a WOFF2, WOFF, TTF, or OTF file')
			return
		}
		if (file.size > MAX_FONT_SIZE) {
			onError('Font size must be less than 2MB')
			return
		}
		onUpload(role, file)
	}

	return (
		<div>
			<input
				ref={inputRef}
				type="file"
				accept={FONT_ACCEPT}
				className="sr-only"
				disabled={disabled}
				onChange={handleChange}
			/>
			{filename ? (
				<div className="flex flex-wrap items-center gap-1.5">
					<p className="text-muted-foreground min-w-0 flex-1 truncate text-[11px]">
						{filename}
					</p>
					<Button
						type="button"
						variant="outline"
						size="xs"
						disabled={disabled}
						onClick={() => inputRef.current?.click()}
					>
						<Trans>Replace</Trans>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						className="text-destructive hover:text-destructive"
						disabled={disabled}
						onClick={() => onRemove(role)}
					>
						<Trans>Remove</Trans>
					</Button>
				</div>
			) : (
				<button
					type="button"
					disabled={disabled}
					onClick={() => inputRef.current?.click()}
					className={cn(
						'text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 hover:underline',
						'focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none',
						'disabled:pointer-events-none disabled:opacity-50',
					)}
				>
					<Trans>Upload a font</Trans>
				</button>
			)}
		</div>
	)
}

export function SiteThemeFields({
	value,
	disabled,
	onChange,
	onUploadFont,
	onRemoveFont,
	onFontError,
	uploadingRole,
}: {
	value: SiteThemeConfig
	disabled?: boolean
	onChange: (next: SiteThemeConfig) => void
	onUploadFont?: (role: 'heading' | 'body', file: File) => void
	onRemoveFont?: (role: 'heading' | 'body') => void
	onFontError?: (message: string) => void
	uploadingRole?: 'heading' | 'body' | null
}) {
	const { _ } = useLingui()

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
		full: _(msg`Full`),
	}

	/** Prefer Radix-like order: None → Small → Medium → Large (skip duplicate default). */
	const radiusOptions = SITE_THEME_RADII.filter((r) => r !== 'default')

	return (
		<div className="flex flex-col gap-5">
			<section className="space-y-2">
				<FieldLabel>{_(msg`Headings`)}</FieldLabel>
				<FontSelect
					id="site-heading-font"
					value={value.headingFont}
					customLabel={
						value.headingCustomFont
							? siteFontDisplayName(value.headingCustomFont.filename)
							: null
					}
					disabled={disabled}
					onChange={(headingFont) => onChange({ ...value, headingFont })}
				/>
				{onUploadFont && onRemoveFont ? (
					<FontFileField
						role="heading"
						filename={value.headingCustomFont?.filename ?? null}
						disabled={disabled || uploadingRole === 'heading'}
						onUpload={onUploadFont}
						onRemove={onRemoveFont}
						onError={(message) => onFontError?.(message)}
					/>
				) : null}
				<p className="text-muted-foreground text-[11px] leading-relaxed">
					{_(msg`Titles and section headings.`)}
				</p>
			</section>

			<section className="space-y-2">
				<FieldLabel>{_(msg`Body`)}</FieldLabel>
				<FontSelect
					id="site-body-font"
					value={value.bodyFont}
					customLabel={
						value.bodyCustomFont
							? siteFontDisplayName(value.bodyCustomFont.filename)
							: null
					}
					disabled={disabled}
					onChange={(bodyFont) => onChange({ ...value, bodyFont })}
				/>
				{onUploadFont && onRemoveFont ? (
					<FontFileField
						role="body"
						filename={value.bodyCustomFont?.filename ?? null}
						disabled={disabled || uploadingRole === 'body'}
						onUpload={onUploadFont}
						onRemove={onRemoveFont}
						onError={(message) => onFontError?.(message)}
					/>
				) : null}
				<p className="text-muted-foreground text-[11px] leading-relaxed">
					{_(msg`Paragraphs, navigation, and other text.`)}
				</p>
			</section>

			<section className="space-y-2">
				<FieldLabel>{_(msg`Accent color`)}</FieldLabel>
				<div className="flex flex-wrap gap-2">
					{[...ACCENT_NEUTRALS, ...ACCENT_COLORS].map((themeColor) => {
						const meta = getThemeColorMeta(themeColor)
						return (
							<ColorSwatch
								key={themeColor}
								label={meta.label}
								swatch={meta.swatch}
								selected={value.theme === themeColor}
								disabled={disabled}
								onSelect={() => onChange({ ...value, theme: themeColor })}
							/>
						)
					})}
				</div>
			</section>

			<section className="space-y-2">
				<FieldLabel>{_(msg`Gray color`)}</FieldLabel>
				<div className="flex flex-wrap gap-2">
					{SITE_BASE_COLORS.map((baseColor) => {
						const meta = getBaseColorMeta(baseColor)
						return (
							<ColorSwatch
								key={baseColor}
								label={meta.label}
								swatch={meta.swatch}
								selected={value.baseColor === baseColor}
								disabled={disabled}
								onSelect={() => onChange({ ...value, baseColor })}
							/>
						)
					})}
				</div>
			</section>

			<section className="space-y-2">
				<FieldLabel>{_(msg`Appearance`)}</FieldLabel>
				<div className="grid grid-cols-3 gap-1.5">
					{SITE_THEME_MODES.map((mode) => {
						const isSelected = value.mode === mode
						return (
							<button
								key={mode}
								type="button"
								disabled={disabled}
								onClick={() => onChange({ ...value, mode })}
								aria-pressed={isSelected}
								className={cn(
									'border-border flex items-center justify-center gap-1.5 rounded-md border px-1.5 py-2 text-xs font-medium transition-colors',
									'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
									'disabled:pointer-events-none disabled:opacity-50',
									isSelected
										? 'border-foreground bg-background ring-foreground/10 ring-1'
										: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
								)}
							>
								<Icon name={modeIcons[mode]} className="size-3.5 shrink-0" />
								{modeLabels[mode]}
							</button>
						)
					})}
				</div>
			</section>

			<section className="space-y-2">
				<FieldLabel>{_(msg`Corners`)}</FieldLabel>
				<div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
					{radiusOptions.map((radius) => {
						const isSelected =
							value.radius === radius ||
							(radius === 'medium' && value.radius === 'default')
						return (
							<button
								key={radius}
								type="button"
								disabled={disabled}
								onClick={() => onChange({ ...value, radius })}
								aria-pressed={isSelected}
								className={cn(
									'border-border flex flex-col items-center gap-1 rounded-md border px-1 py-1.5 transition-colors',
									'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
									'disabled:pointer-events-none disabled:opacity-50',
									isSelected
										? 'border-foreground bg-background ring-foreground/10 ring-1'
										: 'hover:bg-muted/50',
								)}
							>
								<RadiusGlyph radius={radius} selected={isSelected} />
								<span
									className={cn(
										'text-[10px] font-medium',
										isSelected ? 'text-foreground' : 'text-muted-foreground',
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
	)
}
