import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@repo/ui'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Icon, type IconName } from '@repo/ui/icon'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from '@repo/ui/item'
import { ScrollArea } from '@repo/ui/scroll-area'
import { Fragment, type DragEvent } from 'react'
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
				<ItemGroup className="gap-0">
					{paletteItems.map((item) => (
						<Fragment key={item.type}>
							<Item
								role="listitem"
								draggable
								onDragStart={(e) => onDragStart(e, item.type, item.defaultData)}
								className="border-b-border rounded-none border-b"
							>
								<ItemMedia>
									<Icon name={PALETTE_ICONS[item.type] ?? 'blocks'} size="xs" />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>
										<span className="truncate">{item.label}</span>
										{item.isGated ? (
											<Badge
												variant="outline"
												className="text-muted-foreground h-4 px-1 text-[9px] uppercase"
											>
												<Trans>Pro</Trans>
											</Badge>
										) : null}
									</ItemTitle>
									<ItemDescription>{item.description}</ItemDescription>
								</ItemContent>

								<ItemActions>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										aria-label={_(msg`Add ${item.label}`)}
										className="text-muted-foreground size-7 p-0 opacity-0 transition-opacity group-hover/item:opacity-100"
										onClick={(e) => {
											e.stopPropagation()
											onAddNode(item)
										}}
										title={_(msg`Add ${item.label}`)}
									>
										<Icon name="plus" size="xs" />
									</Button>
								</ItemActions>
							</Item>
						</Fragment>
					))}
				</ItemGroup>
			</ScrollArea>
		</div>
	)
}
