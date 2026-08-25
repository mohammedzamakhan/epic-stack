import { Trans } from '@lingui/macro'
import { cn } from '@repo/ui'
import { Icon } from '@repo/ui/icon'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { type DelayFlowNode } from '../types.ts'
import { useWorkflowUiLabels } from '../workflow-labels.ts'

function DelayNodeComponent({ data, selected }: NodeProps<DelayFlowNode>) {
	const { delayUnitLabel } = useWorkflowUiLabels()

	return (
		<div
			className={cn(
				'bg-card relative mx-auto min-w-[240px] rounded-md border p-0 shadow-sm transition-all',
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

			<div className="flex items-center justify-between p-3">
				<div className="flex items-center gap-2">
					<div className="text-muted-foreground flex size-5 items-center justify-center">
						<Icon name="clock" size="xs" />
					</div>
					<h4 className="text-foreground text-sm font-medium">
						<Trans>Time delay</Trans>
					</h4>
				</div>
				<Icon name="ellipsis" size="xs" className="text-muted-foreground" />
			</div>

			<div className="px-4 pb-4">
				<div className="border-border bg-muted text-foreground rounded border px-3 py-2 text-center text-sm font-medium">
					<Trans>
						Wait {data.duration} {delayUnitLabel(data.unit)}
					</Trans>
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

export const DelayNode = memo(DelayNodeComponent)
