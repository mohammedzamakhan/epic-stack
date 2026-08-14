import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import {
	getSiteLocaleLabel,
	parseLocalizedString,
	pickLocalized,
	serializeLocalizedString,
	type LocalizedString,
	type SiteContentLocale,
	type SiteLocalesConfig,
} from '@repo/common/site-locales'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Checkbox } from '@repo/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@repo/ui/sheet'
import { Switch } from '@repo/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	Field as FormField,
	TextareaField,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'

export const ANNOUNCEMENT_TYPES = [
	'info',
	'warning',
	'error',
	'success',
] as const

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number]

export const AnnouncementSchema = z
	.object({
		id: z.string().optional(),
		contentJson: z.string().min(1, 'Content is required'),
		defaultLocale: z.string().min(1),
		type: z.enum(ANNOUNCEMENT_TYPES),
		isEnabled: z.enum(['true', 'false']).default('true'),
		addLink: z.enum(['on', 'off']).optional(),
		linkUrl: z.string().trim().optional(),
		linkLabelJson: z.string().optional(),
		linkNewTab: z.enum(['on', 'off']).optional(),
	})
	.superRefine((data, ctx) => {
		let contentMap: LocalizedString = {}
		try {
			contentMap = parseLocalizedString(data.contentJson, data.defaultLocale)
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['contentJson'],
				message: 'Invalid content translations',
			})
			return
		}

		const defaultContent = contentMap[data.defaultLocale]?.trim() ?? ''
		if (!defaultContent) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['contentJson'],
				message: `Content is required in the default language`,
			})
		}

		for (const [locale, value] of Object.entries(contentMap)) {
			if (value && value.length > 500) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['contentJson'],
					message: `Content for ${locale} must be 500 characters or less`,
				})
			}
		}

		const wantsLink = data.addLink === 'on'
		if (!wantsLink) return

		if (!data.linkUrl) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['linkUrl'],
				message: 'Link URL is required when a link is enabled',
			})
			return
		}

		try {
			new URL(data.linkUrl)
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['linkUrl'],
				message: 'Enter a valid URL including https://',
			})
		}

		if (data.linkLabelJson) {
			const labels = parseLocalizedString(
				data.linkLabelJson,
				data.defaultLocale,
			)
			for (const [locale, value] of Object.entries(labels)) {
				if (value && value.length > 80) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ['linkLabelJson'],
						message: `Link label for ${locale} is too long`,
					})
				}
			}
		}
	})

export const createAnnouncementIntent = 'create-announcement'
export const updateAnnouncementIntent = 'update-announcement'
export const deleteAnnouncementIntent = 'delete-announcement'
export const toggleAnnouncementIntent = 'toggle-announcement'

export type AnnouncementRecord = {
	id: string
	content: LocalizedString
	type: AnnouncementType
	isEnabled: boolean
	linkUrl: string | null
	linkLabel: LocalizedString
	linkNewTab: boolean
	position: number | null
	createdAt: string
	updatedAt: string
}

export function getAnnouncementPreviewText(
	announcement: Pick<AnnouncementRecord, 'content'>,
	defaultLocale: string,
): string {
	return (
		pickLocalized(announcement.content, defaultLocale, defaultLocale) ||
		'Untitled announcement'
	)
}

type AnnouncementSheetProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	organizationId: string
	localesConfig: SiteLocalesConfig
	announcement?: AnnouncementRecord | null
}

function emptyLocaleMap(locales: SiteContentLocale[]): LocalizedString {
	return Object.fromEntries(locales.map((locale) => [locale, '']))
}

export function AnnouncementSheet({
	open,
	onOpenChange,
	organizationId,
	localesConfig,
	announcement,
}: AnnouncementSheetProps) {
	const { _ } = useLingui()
	const fetcher = useFetcher<{
		status?: 'success' | 'error'
		result?: unknown
	}>()
	const isEditing = Boolean(announcement)
	const formId = useId()
	const isSubmitting = fetcher.state !== 'idle'
	const sheetKey = announcement?.id ?? 'new'
	const prevFetcherState = useRef(fetcher.state)
	const [formInstance, setFormInstance] = useState(0)

	const locales = localesConfig.locales
	const defaultLocale = localesConfig.defaultLocale

	const [isEnabled, setIsEnabled] = useState(announcement?.isEnabled ?? true)
	const [type, setType] = useState<AnnouncementType>(
		announcement?.type ?? 'info',
	)
	const [addLink, setAddLink] = useState(Boolean(announcement?.linkUrl))
	const [linkNewTab, setLinkNewTab] = useState(announcement?.linkNewTab ?? true)
	const [activeLocale, setActiveLocale] = useState<string>(defaultLocale)
	const [contentByLocale, setContentByLocale] = useState<LocalizedString>(() =>
		emptyLocaleMap(locales),
	)
	const [linkLabelByLocale, setLinkLabelByLocale] = useState<LocalizedString>(
		() => emptyLocaleMap(locales),
	)

	useEffect(() => {
		if (!open) return
		setFormInstance((current) => current + 1)
		setIsEnabled(announcement?.isEnabled ?? true)
		setType(announcement?.type ?? 'info')
		setAddLink(Boolean(announcement?.linkUrl))
		setLinkNewTab(announcement?.linkNewTab ?? true)
		setActiveLocale(defaultLocale)

		const nextContent = emptyLocaleMap(locales)
		const existingContent = announcement?.content ?? {}
		for (const locale of locales) {
			nextContent[locale] = existingContent[locale] ?? ''
		}
		setContentByLocale(nextContent)

		const nextLabels = emptyLocaleMap(locales)
		const existingLabels = announcement?.linkLabel ?? {}
		for (const locale of locales) {
			nextLabels[locale] = existingLabels[locale] ?? ''
		}
		setLinkLabelByLocale(nextLabels)
	}, [open, announcement, locales, defaultLocale])

	const contentJson = useMemo(
		() => serializeLocalizedString(contentByLocale),
		[contentByLocale],
	)
	const linkLabelJson = useMemo(
		() => serializeLocalizedString(linkLabelByLocale),
		[linkLabelByLocale],
	)

	const [form, fields] = useForm({
		id: `${formId}-${sheetKey}-${formInstance}`,
		constraint: getZodConstraint(AnnouncementSchema),
		lastResult:
			fetcher.data?.status === 'error'
				? (fetcher.data.result as never)
				: undefined,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: AnnouncementSchema })
		},
		defaultValue: {
			id: announcement?.id ?? '',
			contentJson,
			defaultLocale,
			type: announcement?.type ?? 'info',
			isEnabled: announcement?.isEnabled === false ? 'false' : 'true',
			addLink: announcement?.linkUrl ? 'on' : undefined,
			linkUrl: announcement?.linkUrl ?? '',
			linkLabelJson,
			linkNewTab: announcement?.linkNewTab === false ? undefined : 'on',
		},
		shouldRevalidate: 'onBlur',
	})

	useEffect(() => {
		const finishedSubmit =
			prevFetcherState.current !== 'idle' && fetcher.state === 'idle'
		prevFetcherState.current = fetcher.state

		if (finishedSubmit && fetcher.data?.status === 'success') {
			onOpenChange(false)
		}
	}, [fetcher.state, fetcher.data, onOpenChange])

	const typeLabels: Record<AnnouncementType, string> = {
		info: _(msg`Info`),
		warning: _(msg`Warning`),
		error: _(msg`Error`),
		success: _(msg`Success`),
	}

	const missingDefaultContent = !(contentByLocale[defaultLocale]?.trim() ?? '')

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 sm:max-w-lg"
			>
				<SheetHeader className="border-b">
					<SheetTitle>
						{isEditing ? (
							<Trans>Edit announcement</Trans>
						) : (
							<Trans>New announcement</Trans>
						)}
					</SheetTitle>
					<SheetDescription>
						<Trans>
							Write announcement copy for each website language. The default
							language is required; other languages are optional.
						</Trans>
					</SheetDescription>
				</SheetHeader>

				<fetcher.Form
					key={`${sheetKey}-${formInstance}`}
					method="POST"
					{...getFormProps(form)}
					className="flex min-h-0 flex-1 flex-col"
				>
					<input
						type="hidden"
						name="intent"
						value={
							isEditing ? updateAnnouncementIntent : createAnnouncementIntent
						}
					/>
					<input type="hidden" name="organizationId" value={organizationId} />
					{isEditing ? (
						<input type="hidden" name="id" value={announcement?.id} />
					) : null}
					<input
						type="hidden"
						name="isEnabled"
						value={isEnabled ? 'true' : 'false'}
					/>
					<input type="hidden" name="type" value={type} />
					<input type="hidden" name="defaultLocale" value={defaultLocale} />
					<input type="hidden" name="contentJson" value={contentJson} />
					<input type="hidden" name="linkLabelJson" value={linkLabelJson} />
					{addLink ? <input type="hidden" name="addLink" value="on" /> : null}
					{linkNewTab && addLink ? (
						<input type="hidden" name="linkNewTab" value="on" />
					) : null}

					<div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
						<div className="flex items-center justify-between gap-3">
							<div className="space-y-0.5">
								<p className="text-sm font-medium">
									<Trans>Enabled</Trans>
								</p>
								<p className="text-muted-foreground text-xs">
									<Trans>Show this banner on your public site</Trans>
								</p>
							</div>
							<Switch
								checked={isEnabled}
								onCheckedChange={(checked) => setIsEnabled(Boolean(checked))}
								disabled={isSubmitting}
							/>
						</div>

						<Field data-invalid={Boolean(fields.type.errors?.length)}>
							<FieldLabel htmlFor={fields.type.id}>
								<Trans>Type</Trans>
							</FieldLabel>
							<Select
								value={type}
								onValueChange={(value) => {
									if (
										value === 'info' ||
										value === 'warning' ||
										value === 'error' ||
										value === 'success'
									) {
										setType(value)
									}
								}}
								disabled={isSubmitting}
							>
								<SelectTrigger id={fields.type.id} className="w-full">
									<SelectValue placeholder={_(msg`Select type`)}>
										{typeLabels[type]}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{ANNOUNCEMENT_TYPES.map((announcementType) => (
										<SelectItem key={announcementType} value={announcementType}>
											{typeLabels[announcementType]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError
								errors={convertErrorsToFieldFormat(fields.type.errors)}
							/>
						</Field>

						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm font-medium">
									<Trans>Translations</Trans>
								</p>
								{missingDefaultContent ? (
									<Badge variant="secondary">
										<Trans>Default language required</Trans>
									</Badge>
								) : null}
							</div>

							{locales.length > 1 ? (
								<Tabs
									value={activeLocale}
									onValueChange={(value) => {
										if (value) setActiveLocale(value)
									}}
								>
									<TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
										{locales.map((locale) => {
											const hasCopy = Boolean(contentByLocale[locale]?.trim())
											return (
												<TabsTrigger
													key={locale}
													value={locale}
													className="gap-1.5"
												>
													{getSiteLocaleLabel(locale)}
													{locale === defaultLocale ? (
														<span className="text-[10px] uppercase opacity-70">
															<Trans>Default</Trans>
														</span>
													) : hasCopy ? (
														<span
															className="bg-primary size-1.5 rounded-full"
															aria-hidden="true"
														/>
													) : null}
												</TabsTrigger>
											)
										})}
									</TabsList>

									{locales.map((locale) => (
										<TabsContent
											key={locale}
											value={locale}
											className="mt-3 space-y-4"
										>
											<TextareaField
												labelProps={{
													children: `${_(msg`Content`)} (${getSiteLocaleLabel(locale)})`,
												}}
												textareaProps={{
													name: `content-${locale}`,
													value: contentByLocale[locale] ?? '',
													onChange: (event) => {
														const value = event.currentTarget.value
														setContentByLocale((current) => ({
															...current,
															[locale]: value,
														}))
													},
													rows: 4,
													placeholder: _(
														msg`Share an update, maintenance notice, or promotion…`,
													),
													disabled: isSubmitting,
												}}
												errors={
													locale === defaultLocale
														? fields.contentJson.errors
														: undefined
												}
											/>

											{addLink ? (
												<FormField
													labelProps={{
														children: `${_(msg`Link label`)} (${getSiteLocaleLabel(locale)})`,
													}}
													inputProps={{
														name: `linkLabel-${locale}`,
														value: linkLabelByLocale[locale] ?? '',
														onChange: (event) => {
															const value = event.currentTarget.value
															setLinkLabelByLocale((current) => ({
																...current,
																[locale]: value,
															}))
														},
														placeholder: _(msg`Learn more`),
														disabled: isSubmitting,
													}}
													errors={
														locale === defaultLocale
															? fields.linkLabelJson.errors
															: undefined
													}
												/>
											) : null}
										</TabsContent>
									))}
								</Tabs>
							) : (
								<>
									<TextareaField
										labelProps={{ children: _(msg`Content`) }}
										textareaProps={{
											name: `content-${defaultLocale}`,
											value: contentByLocale[defaultLocale] ?? '',
											onChange: (event) => {
												const value = event.currentTarget.value
												setContentByLocale((current) => ({
													...current,
													[defaultLocale]: value,
												}))
											},
											rows: 4,
											placeholder: _(
												msg`Share an update, maintenance notice, or promotion…`,
											),
											disabled: isSubmitting,
										}}
										errors={fields.contentJson.errors}
									/>
									{addLink ? (
										<FormField
											labelProps={{ children: _(msg`Link label`) }}
											inputProps={{
												name: `linkLabel-${defaultLocale}`,
												value: linkLabelByLocale[defaultLocale] ?? '',
												onChange: (event) => {
													const value = event.currentTarget.value
													setLinkLabelByLocale((current) => ({
														...current,
														[defaultLocale]: value,
													}))
												},
												placeholder: _(msg`Learn more`),
												disabled: isSubmitting,
											}}
											errors={fields.linkLabelJson.errors}
										/>
									) : null}
								</>
							)}
						</div>

						<FieldGroup>
							<label className="flex items-center gap-2 text-sm">
								<Checkbox
									checked={addLink}
									onCheckedChange={(checked) => setAddLink(checked === true)}
									disabled={isSubmitting}
								/>
								<Trans>Add a link</Trans>
							</label>

							{addLink ? (
								<div className="space-y-4 pl-6">
									<FormField
										labelProps={{ children: _(msg`Link URL`) }}
										inputProps={{
											...getInputProps(fields.linkUrl, { type: 'url' }),
											placeholder: 'https://…',
											disabled: isSubmitting,
										}}
										errors={fields.linkUrl.errors}
									/>
									<label className="flex items-center gap-2 text-sm">
										<Checkbox
											checked={linkNewTab}
											onCheckedChange={(checked) =>
												setLinkNewTab(checked === true)
											}
											disabled={isSubmitting}
										/>
										<Trans>Open in new tab</Trans>
									</label>
									{locales.length > 1 ? (
										<p className="text-muted-foreground text-xs">
											<Trans>
												Link labels can be translated in each language tab
												above. The URL is shared across languages.
											</Trans>
										</p>
									) : null}
								</div>
							) : null}
						</FieldGroup>

						<ErrorList errors={form.errors} id={form.errorId} />
					</div>

					<SheetFooter className="border-t sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isEditing ? (
								<Trans>Save changes</Trans>
							) : (
								<Trans>Add announcement</Trans>
							)}
						</Button>
					</SheetFooter>
				</fetcher.Form>
			</SheetContent>
		</Sheet>
	)
}
