import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@repo/ui'
import { Icon } from '@repo/ui/icon'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { type TriggerFlowNode } from '../types.ts'
import { useWorkflowConfig } from '../workflow-config.tsx'

function TriggerNodeComponent({ data, selected }: NodeProps<TriggerFlowNode>) {
	const { _ } = useLingui()
	const { triggerLabels } = useWorkflowConfig()
	const triggerType = data.triggerType || 'phone_verified'
	const info = triggerLabels[triggerType] || {
		label: triggerType,
		desc: _(msg`Custom trigger event`),
	}

	return (
		<div
			className={cn(
				'bg-card relative min-w-[280px] rounded-md border p-0 shadow-sm transition-all',
				'border-border hover:shadow-md',
				selected && 'ring-ring border-foreground/20 ring-1',
			)}
		>
			<div className="border-border flex items-center justify-between border-b p-3">
				<div className="flex items-center gap-2">
					<div className="text-muted-foreground flex size-5 items-center justify-center">
						<Icon name="play" size="xs" />
					</div>
					<h4 className="text-foreground text-sm font-medium">
						<Trans>Trigger</Trans>
					</h4>
				</div>
				<Icon name="user" size="xs" className="text-muted-foreground" />
			</div>

			<div className="p-4 text-center">
				<p className="text-muted-foreground text-sm">
					<Trans>
						When someone does{' '}
						<span className="text-foreground font-semibold">{info.label}</span>
					</Trans>
				</p>
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

export const TriggerNode = memo(TriggerNodeComponent)
