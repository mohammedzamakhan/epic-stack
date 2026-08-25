import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@repo/ui'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Icon, type IconName } from '@repo/ui/icon'
import { ScrollArea } from '@repo/ui/scroll-area'
import { type DragEvent } from 'react'
import { type PaletteItem } from './types.ts'
import { useWorkflowConfig } from './workflow-config.tsx'

const PALETTE_ICONS: Record<string, IconName> = {
	trigger: 'play',
	delay: 'clock',
	action_email: 'mail',
	action_sms: 'smartphone',
	condition: 'route',
}

interface NodePaletteProps {
	onAddNode: (item: PaletteItem) => void
	className?: string
}

export function NodePalette({ onAddNode, className }: NodePaletteProps) {
	const { _ } = useLingui()
	const { paletteItems } = useWorkflowConfig()

	const onDragStart = (
		event: DragEvent,
		nodeType: string,
		defaultData: Record<string, unknown>,
	) => {
		event.dataTransfer.setData('application/reactflow', nodeType)
		event.dataTransfer.setData(
			'application/reactflow-data',
			JSON.stringify(defaultData),
		)
		event.dataTransfer.effectAllowed = 'move'
	}

	return (
		<div className={cn('flex h-full min-h-0 flex-col', className)}>
			<div className="border-border flex items-center gap-2 border-b px-3 py-2.5">
				<span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-md">
					<Icon name="blocks" size="xs" />
				</span>
				<span className="min-w-0 truncate text-sm font-medium">
					<Trans>Nodes</Trans>
				</span>
				<span className="text-muted-foreground text-xs tabular-nums">
					{paletteItems.length}
				</span>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-2 p-3">
					{paletteItems.map((item) => (
						<div
							key={item.type}
							draggable
							onDragStart={(e) => onDragStart(e, item.type, item.defaultData)}
							className="group bg-card hover:bg-muted/40 flex cursor-grab items-center justify-between rounded-lg border px-3 py-2.5 transition-colors active:cursor-grabbing"
						>
							<div className="flex min-w-0 items-center gap-3">
								<span className="text-muted-foreground bg-muted/40 flex size-7 shrink-0 items-center justify-center rounded-md border">
									<Icon name={PALETTE_ICONS[item.type] ?? 'blocks'} size="xs" />
								</span>
								<div className="min-w-0">
									<div className="flex items-center gap-1.5">
										<p className="truncate text-xs font-medium">{item.label}</p>
										{item.isGated ? (
											<Badge
												variant="outline"
												className="text-muted-foreground h-4 px-1 text-[9px] uppercase"
											>
												<Trans>Pro</Trans>
											</Badge>
										) : null}
									</div>
									<p className="text-muted-foreground line-clamp-1 text-[11px]">
										{item.description}
									</p>
								</div>
							</div>

							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-muted-foreground size-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
								onClick={(e) => {
									e.stopPropagation()
									onAddNode(item)
								}}
								title={_(msg`Add ${item.label}`)}
							>
								<Icon name="plus" size="xs" />
							</Button>
						</div>
					))}
				</div>
			</ScrollArea>
		</div>
	)
}
