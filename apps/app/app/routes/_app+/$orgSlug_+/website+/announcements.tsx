import { parseWithZod } from '@conform-to/zod'
import { Trans, msg, t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { requireUserId } from '@repo/auth'
import {
	parseLocalizedString,
	parseSiteLocalesConfig,
	pickLocalized,
	serializeLocalizedString,
} from '@repo/common/site-locales'
import { prisma } from '@repo/database'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Switch } from '@repo/ui/switch'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui/table'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useState } from 'react'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	useFetcher,
	useLoaderData,
	useRevalidator,
} from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'
import {
	AnnouncementSchema,
	AnnouncementSheet,
	ANNOUNCEMENT_TYPES,
	createAnnouncementIntent,
	deleteAnnouncementIntent,
	getAnnouncementPreviewText,
	toggleAnnouncementIntent,
	updateAnnouncementIntent,
	type AnnouncementRecord,
	type AnnouncementType,
} from '#app/components/settings/cards/organization/announcement-sheet.tsx'
import { requireUserOrganization } from '#app/utils/organization/loader.server.ts'
import {
	ORG_PERMISSIONS,
	requireUserWithOrganizationPermission,
} from '#app/utils/organization/permissions.server.ts'

function isAnnouncementType(value: string): value is AnnouncementType {
	return (ANNOUNCEMENT_TYPES as readonly string[]).includes(value)
}

function serializeAnnouncement(
	announcement: {
		id: string
		content: string
		type: string
		isEnabled: boolean
		linkUrl: string | null
		linkLabel: string | null
		linkNewTab: boolean
		position: number | null
		createdAt: Date
		updatedAt: Date
	},
	defaultLocale: string,
): AnnouncementRecord {
	return {
		id: announcement.id,
		content: parseLocalizedString(announcement.content, defaultLocale),
		type: isAnnouncementType(announcement.type) ? announcement.type : 'info',
		isEnabled: announcement.isEnabled,
		linkUrl: announcement.linkUrl,
		linkLabel: parseLocalizedString(announcement.linkLabel, defaultLocale),
		linkNewTab: announcement.linkNewTab,
		position: announcement.position,
		createdAt: announcement.createdAt.toISOString(),
		updatedAt: announcement.updatedAt.toISOString(),
	}
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)

	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
		siteLocales: true,
		siteDefaultLocale: true,
	})

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.READ_SETTINGS_ANY,
	)

	const localesConfig = parseSiteLocalesConfig(
		organization.siteLocales,
		organization.siteDefaultLocale,
	)

	const announcements = await prisma.organizationAnnouncement.findMany({
		where: { organizationId: organization.id },
		orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
	})

	return {
		organization,
		localesConfig,
		announcements: announcements.map((announcement) =>
			serializeAnnouncement(announcement, localesConfig.defaultLocale),
		),
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	await requireUserId(request)
	const organization = await requireUserOrganization(request, params.orgSlug, {
		id: true,
		slug: true,
		siteLocales: true,
		siteDefaultLocale: true,
	})

	await requireUserWithOrganizationPermission(
		request,
		organization.id,
		ORG_PERMISSIONS.UPDATE_SETTINGS_ANY,
	)

	const localesConfig = parseSiteLocalesConfig(
		organization.siteLocales,
		organization.siteDefaultLocale,
	)

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (
		intent === createAnnouncementIntent ||
		intent === updateAnnouncementIntent
	) {
		const submission = parseWithZod(formData, { schema: AnnouncementSchema })

		if (submission.status !== 'success') {
			return Response.json({
				status: 'error',
				result: submission.reply(),
			})
		}

		const {
			id,
			contentJson,
			type,
			isEnabled,
			addLink,
			linkUrl,
			linkLabelJson,
			linkNewTab,
			defaultLocale,
		} = submission.value
		const wantsLink = addLink === 'on'
		const contentMap = parseLocalizedString(
			contentJson,
			defaultLocale || localesConfig.defaultLocale,
		)
		const linkLabelMap = wantsLink
			? parseLocalizedString(
					linkLabelJson,
					defaultLocale || localesConfig.defaultLocale,
				)
			: {}

		const data = {
			content: serializeLocalizedString(contentMap),
			type,
			isEnabled: isEnabled === 'true',
			linkUrl: wantsLink ? (linkUrl ?? null) : null,
			linkLabel: wantsLink
				? serializeLocalizedString(linkLabelMap) || null
				: null,
			linkNewTab: wantsLink ? linkNewTab === 'on' : true,
		}

		if (intent === createAnnouncementIntent) {
			const last = await prisma.organizationAnnouncement.findFirst({
				where: { organizationId: organization.id },
				orderBy: { position: 'desc' },
				select: { position: true },
			})
			const nextPosition = (last?.position ?? 0) + 1

			await prisma.organizationAnnouncement.create({
				data: {
					organizationId: organization.id,
					position: nextPosition,
					...data,
				},
			})

			return Response.json({ status: 'success' })
		}

		if (!id) {
			return Response.json(
				{
					status: 'error',
					result: submission.reply({
						formErrors: ['Announcement not found'],
					}),
				},
				{ status: 400 },
			)
		}

		const existing = await prisma.organizationAnnouncement.findFirst({
			where: { id, organizationId: organization.id },
			select: { id: true },
		})

		if (!existing) {
			return Response.json(
				{
					status: 'error',
					result: submission.reply({
						formErrors: ['Announcement not found'],
					}),
				},
				{ status: 404 },
			)
		}

		await prisma.organizationAnnouncement.update({
			where: { id },
			data,
		})

		return Response.json({ status: 'success' })
	}

	if (intent === toggleAnnouncementIntent) {
		const id = String(formData.get('id') || '')
		const isEnabled = formData.get('isEnabled') === 'true'

		if (!id) {
			return Response.json({ status: 'error' }, { status: 400 })
		}

		const existing = await prisma.organizationAnnouncement.findFirst({
			where: { id, organizationId: organization.id },
			select: { id: true },
		})

		if (!existing) {
			return Response.json({ status: 'error' }, { status: 404 })
		}

		await prisma.organizationAnnouncement.update({
			where: { id },
			data: { isEnabled },
		})

		return Response.json({ status: 'success' })
	}

	if (intent === deleteAnnouncementIntent) {
		const id = String(formData.get('id') || '')

		if (!id) {
			return Response.json({ status: 'error' }, { status: 400 })
		}

		await prisma.organizationAnnouncement.deleteMany({
			where: { id, organizationId: organization.id },
		})

		return Response.json({ status: 'success' })
	}

	return Response.json({ status: 'error' }, { status: 400 })
}

function TypeBadge({ type }: { type: AnnouncementType }) {
	const { _ } = useLingui()
	const labels: Record<AnnouncementType, string> = {
		info: _(msg`Info`),
		warning: _(msg`Warning`),
		error: _(msg`Error`),
		success: _(msg`Success`),
	}

	const variant =
		type === 'error'
			? 'destructive'
			: type === 'warning'
				? 'secondary'
				: 'outline'

	return <Badge variant={variant}>{labels[type]}</Badge>
}

function AnnouncementRow({
	announcement,
	defaultLocale,
	onEdit,
}: {
	announcement: AnnouncementRecord
	defaultLocale: string
	onEdit: (announcement: AnnouncementRecord) => void
}) {
	const { _ } = useLingui()
	const toggleFetcher = useFetcher()
	const deleteFetcher = useFetcher()
	const busy = toggleFetcher.state !== 'idle' || deleteFetcher.state !== 'idle'
	const isEnabled =
		toggleFetcher.formData?.get('isEnabled') !== undefined
			? toggleFetcher.formData.get('isEnabled') === 'true'
			: announcement.isEnabled
	const preview = getAnnouncementPreviewText(announcement, defaultLocale)
	const linkLabel =
		pickLocalized(announcement.linkLabel, defaultLocale, defaultLocale) ||
		announcement.linkUrl

	return (
		<TableRow className={busy ? 'opacity-60' : undefined}>
			<TableCell className="w-18">
				<Switch
					checked={isEnabled}
					disabled={busy}
					aria-label={_(msg`Toggle announcement visibility`)}
					onCheckedChange={(checked) => {
						void toggleFetcher.submit(
							{
								intent: toggleAnnouncementIntent,
								id: announcement.id,
								isEnabled: checked ? 'true' : 'false',
							},
							{ method: 'POST' },
						)
					}}
				/>
			</TableCell>
			<TableCell className="max-w-70">
				<button
					type="button"
					className="hover:text-primary line-clamp-2 text-left text-sm font-medium"
					onClick={() => onEdit(announcement)}
				>
					{preview}
				</button>
			</TableCell>
			<TableCell>
				<TypeBadge type={announcement.type} />
			</TableCell>
			<TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
				{announcement.linkUrl ? (
					<span className="line-clamp-1">{linkLabel}</span>
				) : (
					<span>—</span>
				)}
			</TableCell>
			<TableCell className="text-muted-foreground hidden text-sm md:table-cell">
				{formatDistanceToNow(new Date(announcement.updatedAt), {
					addSuffix: true,
				})}
			</TableCell>
			<TableCell className="text-right">
				<div className="flex justify-end gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label={_(msg`Edit announcement`)}
						onClick={() => onEdit(announcement)}
						disabled={busy}
					>
						<Icon name="pencil" className="size-4" />
					</Button>
					<deleteFetcher.Form method="POST">
						<input
							type="hidden"
							name="intent"
							value={deleteAnnouncementIntent}
						/>
						<input type="hidden" name="id" value={announcement.id} />
						<Button
							type="submit"
							variant="ghost"
							size="icon-sm"
							aria-label={_(msg`Delete announcement`)}
							disabled={busy}
						>
							<Icon name="trash-2" className="size-4" />
						</Button>
					</deleteFetcher.Form>
				</div>
			</TableCell>
		</TableRow>
	)
}

export default function WebsiteAnnouncementsRoute() {
	const { organization, announcements, localesConfig } =
		useLoaderData<typeof loader>()
	const revalidator = useRevalidator()
	const [sheetOpen, setSheetOpen] = useState(false)
	const [editing, setEditing] = useState<AnnouncementRecord | null>(null)

	const handleOpenChange = useCallback(
		(open: boolean) => {
			setSheetOpen(open)
			if (!open) {
				setEditing(null)
				void revalidator.revalidate()
			}
		},
		[revalidator],
	)

	const handleEdit = useCallback((announcement: AnnouncementRecord) => {
		setEditing(announcement)
		setSheetOpen(true)
	}, [])

	return (
		<>
			<div className="space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<h2 className="text-base font-semibold">
							<Trans>Announcements</Trans>
						</h2>
						<p className="text-muted-foreground text-sm">
							<Trans>
								Create banner announcements for your public organization site.
								Enabled banners appear at the top of the site for visitors.
							</Trans>
						</p>
					</div>
					<Button
						type="button"
						size="sm"
						className="shrink-0"
						onClick={() => {
							setEditing(null)
							setSheetOpen(true)
						}}
					>
						<Icon name="plus" className="size-4" />
						<Trans>Add announcement</Trans>
					</Button>
				</div>

				{announcements.length === 0 ? (
					<EmptyState
						title={t`No announcements yet`}
						description={t`Add an announcement to share updates, maintenance notices, or promotions on your public site.`}
						icons={['bell']}
					/>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-18">
										<Trans>Live</Trans>
									</TableHead>
									<TableHead>
										<Trans>Content</Trans>
									</TableHead>
									<TableHead>
										<Trans>Type</Trans>
									</TableHead>
									<TableHead className="hidden sm:table-cell">
										<Trans>Link</Trans>
									</TableHead>
									<TableHead className="hidden md:table-cell">
										<Trans>Updated</Trans>
									</TableHead>
									<TableHead className="w-22">
										<span className="sr-only">
											<Trans>Actions</Trans>
										</span>
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{announcements.map((announcement) => (
									<AnnouncementRow
										key={announcement.id}
										announcement={announcement}
										defaultLocale={localesConfig.defaultLocale}
										onEdit={handleEdit}
									/>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</div>

			<AnnouncementSheet
				open={sheetOpen}
				onOpenChange={handleOpenChange}
				organizationId={organization.id}
				localesConfig={localesConfig}
				announcement={editing}
			/>
		</>
	)
}
