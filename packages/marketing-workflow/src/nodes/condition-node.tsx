import { Trans } from '@lingui/macro'
import { cn } from '@repo/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
import { Icon } from '@repo/ui/icon'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { type ConditionFlowNode } from '../types.ts'
import { useWorkflowUiLabels } from '../workflow-labels.ts'

function ConditionNodeComponent({
	data,
	selected,
}: NodeProps<ConditionFlowNode>) {
	const { conditionFieldLabel } = useWorkflowUiLabels()

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
				<CardTitle as="h4" className="flex items-center gap-2">
					<span className="text-muted-foreground flex size-5 items-center justify-center">
						<Icon name="route" size="xs" />
					</span>
					<Trans>Conditional split</Trans>
				</CardTitle>
			</CardHeader>

			<CardContent className="ml-7">
				<p className="text-muted-foreground line-clamp-2 text-sm">
					{data.field === 'phoneVerified' ? (
						<Trans>
							Customer{' '}
							<span className="text-foreground font-medium">Phone</span> is{' '}
							{data.value === 'true' ? '' : 'not '}
							<span className="text-foreground font-medium">Verified</span>
						</Trans>
					) : (
						<Trans>
							<span className="text-foreground font-medium">
								{conditionFieldLabel(data.field || 'email')}
							</span>{' '}
							{data.operator === 'equals'
								? 'is'
								: data.operator === 'not_equals'
									? 'is not'
									: 'contains'}{' '}
							<span className="text-foreground font-medium">
								"{data.value}"
							</span>
						</Trans>
					)}
				</p>
			</CardContent>

			<Handle
				type="source"
				position={Position.Bottom}
				id="true"
				className="border-background bg-foreground size-3 border-2"
				style={{ left: '25%' }}
			/>
			<div className="border-border bg-card text-foreground absolute -bottom-6 left-[25%] z-10 -translate-x-1/2 rounded border px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
				<Trans>Yes</Trans>
			</div>

			<Handle
				type="source"
				position={Position.Bottom}
				id="false"
				className="border-background bg-muted-foreground size-3 border-2"
				style={{ left: '75%' }}
			/>
			<div className="border-border bg-card text-muted-foreground absolute -bottom-6 left-[75%] z-10 -translate-x-1/2 rounded border px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
				<Trans>No</Trans>
			</div>
		</Card>
	)
}

export const ConditionNode = memo(ConditionNodeComponent)
