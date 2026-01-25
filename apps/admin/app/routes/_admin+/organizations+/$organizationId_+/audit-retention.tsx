import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { Form, useLoaderData, useNavigation } from 'react-router'
import { auditService, AuditAction, AuditService } from '@repo/audit'
import { redirectWithToast } from '@repo/common/toast'
import { prisma } from '@repo/database'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function loader({
	request,
	params,
}: {
	request: Request
	params: { organizationId: string }
}) {
	await requireUserWithRole(request, 'admin')

	const organization = await prisma.organization.findUnique({
		where: { id: params.organizationId },
		select: {
			id: true,
			name: true,
			slug: true,
		},
	})

	if (!organization) {
		throw new Response('Organization not found', { status: 404 })
	}

	// Get or create retention policy
	const retentionPolicy = await auditService.getRetentionPolicy(
		params.organizationId,
	)

	// Get audit log statistics
	const totalLogs = await prisma.auditLog.count({
		where: { organizationId: params.organizationId },
	})

	const archivedLogs = await prisma.auditLog.count({
		where: { organizationId: params.organizationId, archived: true },
	})

	const oldestLog = await prisma.auditLog.findFirst({
		where: { organizationId: params.organizationId },
		orderBy: { createdAt: 'asc' },
		select: { createdAt: true },
	})

	const compliancePresets = AuditService.getCompliancePresets()

	return {
		organization,
		retentionPolicy,
		statistics: {
			total: totalLogs,
			archived: archivedLogs,
			active: totalLogs - archivedLogs,
			oldestDate: oldestLog?.createdAt,
		},
		compliancePresets,
	}
}

export async function action({
	request,
	params,
}: {
	request: Request
	params: { organizationId: string }
}) {
	const adminUser = await requireUserWithRole(request, 'admin')

	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'update-policy') {
		const retentionDays = Number(formData.get('retentionDays'))
		const hotStorageDays = Number(formData.get('hotStorageDays'))
		const archiveEnabled = formData.get('archiveEnabled') === 'true'
		const exportEnabled = formData.get('exportEnabled') === 'true'
		const complianceType = formData.get('complianceType') as string | null

		await auditService.updateRetentionPolicy(params.organizationId, {
			retentionDays,
			hotStorageDays,
			archiveEnabled,
			exportEnabled,
			complianceType: complianceType || null,
		})

		// Log the policy update
		await auditService.logAdminOperation(
			AuditAction.ADMIN_CONFIG_CHANGED,
			adminUser,
			`Updated audit log retention policy for organization`,
			{
				retentionDays,
				hotStorageDays,
				archiveEnabled,
				exportEnabled,
				complianceType,
			},
			request,
		)

		return redirectWithToast(
			`/organizations/${params.organizationId}/audit-retention`,
			{
				title: 'Retention Policy Updated',
				description:
					'Audit log retention policy has been updated successfully.',
				type: 'success',
			},
		)
	}

	if (intent === 'apply-preset') {
		const presetType = formData.get('presetType') as string
		const presets = AuditService.getCompliancePresets()

		const preset = presets[presetType as keyof typeof presets]
		if (!preset) {
			return Response.json({ error: 'Invalid preset type' }, { status: 400 })
		}

		await auditService.updateRetentionPolicy(params.organizationId, {
			retentionDays: preset.retentionDays,
			hotStorageDays: preset.hotStorageDays,
			complianceType: preset.complianceType,
		})

		await auditService.logAdminOperation(
			AuditAction.ADMIN_CONFIG_CHANGED,
			adminUser,
			`Applied ${presetType} compliance preset to retention policy`,
			{
				preset: presetType,
				...preset,
			},
			request,
		)

		return redirectWithToast(
			`/organizations/${params.organizationId}/audit-retention`,
			{
				title: 'Preset Applied',
				description: `${presetType} compliance preset has been applied successfully.`,
				type: 'success',
			},
		)
	}

	if (intent === 'archive-old-logs') {
		const result = await auditService.archiveOldLogs()

		await auditService.logAdminOperation(
			AuditAction.ADMIN_CONFIG_CHANGED,
			adminUser,
			`Manually triggered log archival`,
			{
				archived: result.archived,
				deleted: result.deleted,
			},
			request,
		)

		return redirectWithToast(
			`/organizations/${params.organizationId}/audit-retention`,
			{
				title: 'Archival Complete',
				description: `Archived ${result.archived} logs, deleted ${result.deleted} expired logs.`,
				type: 'success',
			},
		)
	}

	return Response.json({ error: 'Invalid intent' }, { status: 400 })
}

export default function AuditRetentionPage() {
	const { organization, retentionPolicy, statistics, compliancePresets } =
		useLoaderData<typeof loader>()
	const navigation = useNavigation()
	const isSubmitting = navigation.state === 'submitting'
	const { _ } = useLingui()

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold">
					<Trans>Audit Log Retention Policy</Trans>
				</h1>
				<p className="text-muted-foreground">
					<Trans>
						Configure retention and archival settings for {organization.name}
					</Trans>
				</p>
			</div>

			{/* Statistics */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Total Audit Logs</Trans>
						</CardTitle>
						<Icon name="database" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.total.toLocaleString()}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Archived Logs</Trans>
						</CardTitle>
						<Icon name="folder" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{statistics.archived.toLocaleString()}
						</div>
						<p className="text-muted-foreground text-xs">
							<Trans>{statistics.active.toLocaleString()} active</Trans>
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							<Trans>Oldest Log</Trans>
						</CardTitle>
						<Icon name="clock" className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-sm font-medium">
							{statistics.oldestDate
								? new Date(statistics.oldestDate).toLocaleDateString()
								: _(msg`N/A`)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Compliance Presets */}
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Compliance Presets</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>Quick apply industry-standard retention policies</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
						{Object.entries(compliancePresets).map(
							([key, preset]: [string, any]) => (
								<Form method="post" key={key}>
									<input type="hidden" name="intent" value="apply-preset" />
									<input type="hidden" name="presetType" value={key} />
									<Card className="relative">
										<CardHeader>
											<CardTitle className="flex items-center justify-between text-base">
												{key.replace(/_/g, ' ')}
												{retentionPolicy.complianceType ===
													preset.complianceType && (
													<Badge variant="default">
														<Trans>Active</Trans>
													</Badge>
												)}
											</CardTitle>
										</CardHeader>
										<CardContent className="space-y-2">
											<div className="text-sm">
												<p className="text-muted-foreground">
													<Trans>
														Retention: {preset.retentionDays} days (
														{Math.floor(preset.retentionDays / 365)} years)
													</Trans>
												</p>
												<p className="text-muted-foreground">
													<Trans>
														Hot storage: {preset.hotStorageDays} days
													</Trans>
												</p>
											</div>
											<Button
												type="submit"
												variant="outline"
												size="sm"
												className="w-full"
												disabled={isSubmitting}
											>
												<Trans>Apply Preset</Trans>
											</Button>
										</CardContent>
									</Card>
								</Form>
							),
						)}
					</div>
				</CardContent>
			</Card>

			{/* Custom Configuration */}
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Custom Retention Policy</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>Configure custom retention and archival settings</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form method="post" className="space-y-6">
						<input type="hidden" name="intent" value="update-policy" />

						<div className="grid gap-6 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="retentionDays">
									<Trans>Retention Period (days)</Trans>
								</Label>
								<Input
									id="retentionDays"
									name="retentionDays"
									type="number"
									min="1"
									max="3650"
									defaultValue={retentionPolicy.retentionDays}
									required
								/>
								<p className="text-muted-foreground text-xs">
									<Trans>How long to keep logs before permanent deletion</Trans>
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="hotStorageDays">
									<Trans>Hot Storage Period (days)</Trans>
								</Label>
								<Input
									id="hotStorageDays"
									name="hotStorageDays"
									type="number"
									min="1"
									max="365"
									defaultValue={retentionPolicy.hotStorageDays}
									required
								/>
								<p className="text-muted-foreground text-xs">
									<Trans>How long to keep logs readily searchable</Trans>
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="archiveEnabled">
									<Trans>Enable Archiving</Trans>
								</Label>
								<Select
									name="archiveEnabled"
									defaultValue={String(retentionPolicy.archiveEnabled)}
								>
									<SelectTrigger id="archiveEnabled">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">
											<Trans>Enabled</Trans>
										</SelectItem>
										<SelectItem value="false">
											<Trans>Disabled</Trans>
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									<Trans>Automatically archive old logs to cold storage</Trans>
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="exportEnabled">
									<Trans>Allow Exports</Trans>
								</Label>
								<Select
									name="exportEnabled"
									defaultValue={String(retentionPolicy.exportEnabled)}
								>
									<SelectTrigger id="exportEnabled">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="true">
											<Trans>Enabled</Trans>
										</SelectItem>
										<SelectItem value="false">
											<Trans>Disabled</Trans>
										</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									<Trans>Allow users to export audit logs</Trans>
								</p>
							</div>

							<div className="space-y-2 md:col-span-2">
								<Label htmlFor="complianceType">
									<Trans>Compliance Standard (Optional)</Trans>
								</Label>
								<Select
									name="complianceType"
									defaultValue={retentionPolicy.complianceType || 'none'}
								>
									<SelectTrigger id="complianceType">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">
											<Trans>None</Trans>
										</SelectItem>
										{Object.keys(compliancePresets).map((key) => (
											<SelectItem key={key} value={key}>
												{key.replace(/_/g, ' ')}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="flex gap-2">
							<Button type="submit" disabled={isSubmitting}>
								<Icon name="check" className="mr-2 h-4 w-4" />
								{isSubmitting ? (
									<Trans>Saving...</Trans>
								) : (
									<Trans>Save Policy</Trans>
								)}
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>

			{/* Manual Actions */}
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Manual Actions</Trans>
					</CardTitle>
					<CardDescription>
						<Trans>Run maintenance tasks on audit logs</Trans>
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form method="post">
						<input type="hidden" name="intent" value="archive-old-logs" />
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div>
								<h3 className="font-medium">
									<Trans>Archive Old Logs</Trans>
								</h3>
								<p className="text-muted-foreground text-sm">
									<Trans>
										Manually trigger archival of logs older than the hot storage
										period
									</Trans>
								</p>
							</div>
							<Button type="submit" variant="outline" disabled={isSubmitting}>
								<Icon name="folder" className="mr-2 h-4 w-4" />
								<Trans>Run Archival</Trans>
							</Button>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	)
}
