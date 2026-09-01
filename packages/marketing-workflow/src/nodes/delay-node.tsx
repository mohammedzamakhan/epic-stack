import { Trans } from '@lingui/macro'
import { cn } from '@repo/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { type DelayFlowNode } from '../types.ts'
import { useWorkflowUiLabels } from '../workflow-labels.ts'

function DelayNodeComponent({ data, selected }: NodeProps<DelayFlowNode>) {
	const { delayUnitLabel } = useWorkflowUiLabels()

	return (
		<Card
			size="sm"
			className={cn(
				'relative w-[280px] overflow-visible transition-shadow',
				selected && 'ring-ring ring-2',
			)}
		>
			<Handle
				type="target"
				position={Position.Top}
				id="input"
				className="border-background bg-muted-foreground size-3 border-2"
			/>

			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<span className="text-muted-foreground flex size-5 items-center justify-center">
						<Icon name="clock" size="xs" />
					</span>
					<Trans>Time delay</Trans>
				</CardTitle>
			</CardHeader>

			<CardContent className="ml-7">
				<p className="text-foreground text-sm">
					<Trans>
						Wait {data.duration} {delayUnitLabel(data.unit)}
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

export const DelayNode = memo(DelayNodeComponent)
