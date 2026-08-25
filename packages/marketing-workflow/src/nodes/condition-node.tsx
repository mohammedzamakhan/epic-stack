import { cn } from '@repo/ui'
import { Icon } from '@repo/ui/icon'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { type ConditionFlowNode } from '../types.ts'

function ConditionNodeComponent({
	data,
	selected,
}: NodeProps<ConditionFlowNode>) {
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
						<Icon name="route" size="xs" />
					</div>
					<h4 className="text-foreground text-sm font-medium">
						Conditional split
					</h4>
				</div>
				<Icon name="ellipsis" size="xs" className="text-muted-foreground" />
			</div>

			<div className="p-4 text-center">
				<p className="text-muted-foreground line-clamp-2 text-sm">
					{data.field === 'phoneVerified' ? (
						<span>
							Customer{' '}
							<span className="text-foreground font-semibold">Phone</span> is{' '}
							{data.value === 'true' ? '' : 'not '}
							<span className="text-foreground font-semibold">Verified</span>
						</span>
					) : (
						<span>
							<span className="text-foreground font-semibold">
								{data.field || 'Field'}
							</span>{' '}
							{data.operator === 'equals'
								? 'is'
								: data.operator === 'not_equals'
									? 'is not'
									: 'contains'}{' '}
							<span className="text-foreground font-semibold">
								"{data.value}"
							</span>
						</span>
					)}
				</p>
			</div>

			<Handle
				type="source"
				position={Position.Bottom}
				id="true"
				className="border-background bg-foreground size-3 border-2"
				style={{ left: '25%' }}
			/>
			<div className="border-border bg-card text-foreground absolute -bottom-6 left-[25%] z-10 -translate-x-1/2 rounded border px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
				Yes
			</div>

			<Handle
				type="source"
				position={Position.Bottom}
				id="false"
				className="border-background bg-muted-foreground size-3 border-2"
				style={{ left: '75%' }}
			/>
			<div className="border-border bg-card text-muted-foreground absolute -bottom-6 left-[75%] z-10 -translate-x-1/2 rounded border px-1.5 py-0.5 text-[10px] font-medium shadow-sm">
				No
			</div>
		</div>
	)
}

export const ConditionNode = memo(ConditionNodeComponent)
