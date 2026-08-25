import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { ScrollArea } from '@repo/ui/scroll-area'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { Textarea } from '@repo/ui/textarea'
import { type Node } from '@xyflow/react'
import React from 'react'
import { type DelayUnit, type ConditionOperator } from './types.ts'
import { useWorkflowConfig } from './workflow-config.tsx'

interface NodeInspectorProps {
	node: Node | null
	onUpdateNodeData: (nodeId: string, newData: Record<string, any>) => void
	onDeleteNode: (nodeId: string) => void
	onClose: () => void
	errors?: string[]
	className?: string
}

export function NodeInspector({
	node,
	onUpdateNodeData,
	onDeleteNode,
	onClose,
	errors = [],
	className,
}: NodeInspectorProps) {
	const { triggerOptions, mergeTagHint } = useWorkflowConfig()

	if (!node) return null

	const data = (node.data || {}) as Record<string, any>

	const handleChange = (key: string, value: any) => {
		onUpdateNodeData(node.id, {
			...data,
			[key]: value,
		})
	}

	const handleConfigChange = (key: string, value: any) => {
		const currentConfig = (data.config || {}) as Record<string, any>
		onUpdateNodeData(node.id, {
			...data,
			config: {
				...currentConfig,
				[key]: value,
			},
		})
	}

	const insertMergeTag = (fieldKey: string, tag: string) => {
		const currentVal = data[fieldKey] || ''
		handleChange(fieldKey, `${currentVal} ${tag}`.trim())
	}

	return (
		<div
			className={cn('bg-background flex h-full min-h-0 flex-col', className)}
		>
			<div className="border-border flex items-center gap-2 border-b px-3 py-2.5">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={onClose}
					aria-label="Back to nodes"
				>
					<Icon name="arrow-left" className="size-4" />
				</Button>
				<span className="min-w-0 truncate text-sm font-medium capitalize">
					{node.type?.replaceAll('_', ' ')}
				</span>
				<div className="flex-1" />
				{node.type !== 'trigger' ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						className="text-muted-foreground hover:text-destructive"
						onClick={() => onDeleteNode(node.id)}
						title="Delete node"
						aria-label="Delete node"
					>
						<Icon name="trash-2" className="size-4" />
					</Button>
				) : null}
			</div>

			{errors.length > 0 ? (
				<div className="border-destructive/20 bg-destructive/5 border-b px-3 py-2.5">
					<p className="text-destructive text-xs font-medium">
						Configuration required
					</p>
					<ul className="text-destructive/90 mt-1 space-y-0.5 text-xs">
						{errors.map((err, i) => (
							<li key={i}>{err}</li>
						))}
					</ul>
				</div>
			) : null}

			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-5 p-4">
					{/* 1. TRIGGER NODE FORM */}
					{node.type === 'trigger' && (
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="triggerType" className="text-xs font-medium">
									Trigger Event Type
								</Label>
								<Select
									value={
										data.triggerType || triggerOptions[0]?.value || 'manual'
									}
									onValueChange={(val) => handleChange('triggerType', val)}
								>
									<SelectTrigger id="triggerType" className="h-9">
										<SelectValue placeholder="Select trigger type" />
									</SelectTrigger>
									<SelectContent>
										{triggerOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-[11px]">
									Select which event initiates this automated journey.
								</p>
							</div>

							{data.triggerType === 'tag_added' && (
								<div className="space-y-1.5">
									<Label htmlFor="tag" className="text-xs font-medium">
										Target Tag Name
									</Label>
									<Input
										id="tag"
										placeholder="e.g. VIP, lead-hot, subscriber"
										value={data.config?.tag || ''}
										onChange={(e) => handleConfigChange('tag', e.target.value)}
										className="h-9"
									/>
								</div>
							)}

							{data.triggerType === 'form_submitted' && (
								<div className="space-y-1.5">
									<Label htmlFor="formId" className="text-xs font-medium">
										Form Identifier / Slug
									</Label>
									<Input
										id="formId"
										placeholder="e.g. contact-us, demo-request"
										value={data.config?.formId || ''}
										onChange={(e) =>
											handleConfigChange('formId', e.target.value)
										}
										className="h-9"
									/>
								</div>
							)}

							{data.triggerType === 'custom_event' && (
								<div className="space-y-1.5">
									<Label htmlFor="eventName" className="text-xs font-medium">
										Custom Event Name
									</Label>
									<Input
										id="eventName"
										placeholder="e.g. checkout_abandoned, tier_upgraded"
										value={data.config?.eventName || ''}
										onChange={(e) =>
											handleConfigChange('eventName', e.target.value)
										}
										className="h-9"
									/>
								</div>
							)}
						</div>
					)}

					{/* 2. DELAY NODE FORM */}
					{node.type === 'delay' && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label htmlFor="duration" className="text-xs font-medium">
										Duration
									</Label>
									<Input
										id="duration"
										type="number"
										min="1"
										value={data.duration ?? 1}
										onChange={(e) =>
											handleChange(
												'duration',
												Math.max(1, parseInt(e.target.value) || 1),
											)
										}
										className="h-9"
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="unit" className="text-xs font-medium">
										Unit
									</Label>
									<Select
										value={data.unit || 'hours'}
										onValueChange={(val: DelayUnit) =>
											handleChange('unit', val)
										}
									>
										<SelectTrigger id="unit" className="h-9">
											<SelectValue placeholder="Unit" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="minutes">Minutes</SelectItem>
											<SelectItem value="hours">Hours</SelectItem>
											<SelectItem value="days">Days</SelectItem>
											<SelectItem value="weeks">Weeks</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<p className="text-muted-foreground text-[11px]">
								The execution engine will durably sleep for {data.duration || 1}{' '}
								{data.unit || 'hours'} before continuing to the next node.
							</p>
						</div>
					)}

					{/* 3. ACTION EMAIL NODE FORM */}
					{node.type === 'action_email' && (
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="subject" className="text-xs font-medium">
									Subject Line
								</Label>
								<Input
									id="subject"
									placeholder="e.g. Welcome {{name}}!"
									value={data.subject || ''}
									onChange={(e) => handleChange('subject', e.target.value)}
									className="h-9"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="fromName" className="text-xs font-medium">
									From Name (Optional)
								</Label>
								<Input
									id="fromName"
									placeholder="e.g. Sarah from Marketing"
									value={data.fromName || ''}
									onChange={(e) => handleChange('fromName', e.target.value)}
									className="h-9"
								/>
							</div>

							{/* Merge Tag Chips */}
							<div className="space-y-1">
								<span className="text-muted-foreground text-[11px] font-semibold">
									Insert Merge Tags:
								</span>
								<div className="flex flex-wrap gap-1.5">
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-6 px-2 font-mono text-[11px]"
										onClick={() => insertMergeTag('bodyHtml', '{{name}}')}
									>
										+ {'{{name}}'}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-6 px-2 font-mono text-[11px]"
										onClick={() => insertMergeTag('bodyHtml', '{{email}}')}
									>
										+ {'{{email}}'}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-6 px-2 font-mono text-[11px]"
										onClick={() => insertMergeTag('bodyHtml', '{{phone}}')}
									>
										+ {'{{phone}}'}
									</Button>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="bodyHtml" className="text-xs font-medium">
									Email HTML Body
								</Label>
								<Textarea
									id="bodyHtml"
									rows={6}
									placeholder="<p>Hi {{name}},</p><p>Welcome to our service!</p>"
									value={data.bodyHtml || ''}
									onChange={(e) => handleChange('bodyHtml', e.target.value)}
									className="font-mono text-xs"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="bodyText" className="text-xs font-medium">
									Plaintext Fallback (Optional)
								</Label>
								<Textarea
									id="bodyText"
									rows={3}
									placeholder="Hi {{name}}, Welcome to our service!"
									value={data.bodyText || ''}
									onChange={(e) => handleChange('bodyText', e.target.value)}
									className="text-xs"
								/>
							</div>
						</div>
					)}

					{/* 4. ACTION SMS NODE FORM */}
					{node.type === 'action_sms' && (
						<div className="space-y-4">
							{/* Merge Tag Chips */}
							<div className="space-y-1">
								<span className="text-muted-foreground text-[11px] font-semibold">
									Insert Merge Tags:
								</span>
								<div className="flex flex-wrap gap-1.5">
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-6 px-2 font-mono text-[11px]"
										onClick={() => insertMergeTag('messageText', '{{name}}')}
									>
										+ {'{{name}}'}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="h-6 px-2 font-mono text-[11px]"
										onClick={() => insertMergeTag('messageText', '{{phone}}')}
									>
										+ {'{{phone}}'}
									</Button>
								</div>
							</div>

							<div className="space-y-1.5">
								<div className="flex items-center justify-between">
									<Label htmlFor="messageText" className="text-xs font-medium">
										SMS Message Text
									</Label>
									<span
										className={cn(
											'font-mono text-[10px]',
											(data.messageText?.length || 0) > 160
												? 'font-semibold text-amber-500'
												: 'text-muted-foreground',
											(data.messageText?.length || 0) > 1600 &&
												'text-destructive font-bold',
										)}
									>
										{data.messageText?.length || 0} / 1600 chars
									</span>
								</div>
								<Textarea
									id="messageText"
									rows={5}
									placeholder="Hi {{name}}, your order has been confirmed!"
									value={data.messageText || ''}
									onChange={(e) => handleChange('messageText', e.target.value)}
									className="text-xs"
									maxLength={1600}
								/>
								<p className="text-muted-foreground text-[11px]">
									SMS messages over 160 characters will be segmented according
									to standard GSM telecommunication protocols.
								</p>
							</div>
						</div>
					)}

					{/* 5. CONDITION NODE FORM */}
					{node.type === 'condition' && (
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="field" className="text-xs font-medium">
									Customer Attribute
								</Label>
								<Select
									value={data.field || 'email'}
									onValueChange={(val: string) => {
										handleChange('field', val)
										if (val === 'phoneVerified') {
											handleChange('operator', 'equals')
											handleChange('value', 'true')
										} else {
											handleChange('operator', 'contains')
											handleChange('value', '')
										}
									}}
								>
									<SelectTrigger id="field" className="h-9">
										<SelectValue placeholder="Select attribute" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="email">Email Address</SelectItem>
										<SelectItem value="phone">Phone Number</SelectItem>
										<SelectItem value="phoneVerified">
											Phone Verification Status
										</SelectItem>
										<SelectItem value="name">Name</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{data.field === 'phoneVerified' ? (
								<div className="space-y-1.5">
									<Label htmlFor="booleanValue" className="text-xs font-medium">
										Verification Status
									</Label>
									<Select
										value={data.value || 'true'}
										onValueChange={(val: string) => handleChange('value', val)}
									>
										<SelectTrigger id="booleanValue" className="h-9">
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="true">Is Verified (True)</SelectItem>
											<SelectItem value="false">
												Not Verified (False)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							) : (
								<>
									<div className="space-y-1.5">
										<Label htmlFor="operator" className="text-xs font-medium">
											Condition Logic
										</Label>
										<Select
											value={data.operator || 'contains'}
											onValueChange={(val: string) =>
												handleChange('operator', val)
											}
										>
											<SelectTrigger id="operator" className="h-9">
												<SelectValue placeholder="Select operator" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="equals">Exactly Equals</SelectItem>
												<SelectItem value="not_equals">
													Does Not Equal
												</SelectItem>
												<SelectItem value="contains">
													Contains (Partial Match)
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-1.5">
										<Label htmlFor="value" className="text-xs font-medium">
											Target Value
										</Label>
										<Input
											id="value"
											placeholder="e.g. @gmail.com"
											value={data.value ?? ''}
											onChange={(e) => handleChange('value', e.target.value)}
											className="h-9"
										/>
									</div>
								</>
							)}

							<div className="bg-muted/40 space-y-1.5 rounded-lg border p-3 text-xs">
								<p className="text-foreground font-semibold">Routing Logic:</p>
								<p className="text-muted-foreground text-[11px]">
									• If Customer{' '}
									{data.field === 'phoneVerified'
										? 'Verification Status'
										: data.field || 'Attribute'}
									{data.field === 'phoneVerified'
										? ' is '
										: data.operator === 'equals'
											? ' equals '
											: data.operator === 'not_equals'
												? ' does not equal '
												: ' contains '}
									<span className="text-foreground font-semibold">
										{data.field === 'phoneVerified'
											? data.value === 'true'
												? 'Verified'
												: 'Not Verified'
											: data.value || '...'}
									</span>{' '}
									&rarr;{' '}
									<span className="font-semibold text-emerald-600 dark:text-emerald-400">
										True branch
									</span>
								</p>
								<p className="text-muted-foreground text-[11px]">
									• Otherwise &rarr;{' '}
									<span className="font-semibold text-rose-600 dark:text-rose-400">
										False branch
									</span>
								</p>
							</div>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
