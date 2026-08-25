import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@repo/ui'
import { Badge } from '@repo/ui/badge'
import { Icon } from '@repo/ui/icon'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { type ActionEmailFlowNode } from '../types.ts'

function ActionEmailNodeComponent({
	data,
	selected,
}: NodeProps<ActionEmailFlowNode>) {
	const { _ } = useLingui()

	return (
		<div
			className={cn(
				'bg-card relative min-w-[280px] rounded-md border p-0 shadow-sm transition-all',
				'border-border hover:shadow-md',
				selected && 'ring-ring border-foreground/20 ring-1',
			)}
		>
			<Handle
				type="target"
				position={Position.Top}
				id="input"
				className="border-background bg-muted-foreground size-3 border-2"
			/>

			<div className="border-border flex items-center justify-between border-b p-3">
				<div className="flex items-center gap-2">
					<div className="text-muted-foreground flex size-5 items-center justify-center">
						<Icon name="mail" size="xs" />
					</div>
					<h4 className="text-foreground text-sm font-medium">
						<Trans>Email</Trans>
					</h4>
				</div>
				<Icon name="ellipsis" size="xs" className="text-muted-foreground" />
			</div>

			<div className="flex flex-col gap-1 p-4">
				<p className="text-foreground truncate text-sm font-medium">
					{data.subject || _(msg`Empty subject`)}
				</p>
				<div className="mt-2 flex items-center justify-between">
					<Icon
						name="external-link"
						size="xs"
						className="text-muted-foreground"
					/>
					<Badge
						variant="outline"
						className="text-muted-foreground text-[10px] font-normal"
					>
						<Trans>Draft</Trans>
					</Badge>
				</div>
			</div>

			<Handle
				type="source"
				position={Position.Bottom}
				id="output"
				className="border-background bg-muted-foreground size-3 border-2"
			/>
		</div>
	)
}

export const ActionEmailNode = memo(ActionEmailNodeComponent)
