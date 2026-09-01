import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@repo/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
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
		<Card
			size="sm"
			className={cn(
				'relative w-[280px] overflow-visible transition-shadow',
				selected && 'ring-ring ring-2',
			)}
		>
			<CardHeader>
				<CardTitle as="h4" className="flex items-center gap-2">
					<span className="text-muted-foreground flex size-5 items-center justify-center">
						<Icon name="play" size="xs" />
					</span>
					<Trans>Trigger</Trans>
				</CardTitle>
			</CardHeader>

			<CardContent className="ml-7">
				<p className="text-muted-foreground text-sm">
					<Trans>
						When someone does{' '}
						<span className="text-foreground font-medium">{info.label}</span>
					</Trans>
				</p>
			</CardContent>

			<Handle
				type="source"
				position={Position.Bottom}
				id="output"
				className="border-background bg-muted-foreground size-3 border-2"
			/>
		</Card>
	)
}

export const TriggerNode = memo(TriggerNodeComponent)
