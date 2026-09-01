import { msg, Trans } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { cn } from '@repo/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card'
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
						<Icon name="mail" size="xs" />
					</span>
					<Trans>Email</Trans>
				</CardTitle>
			</CardHeader>

			<CardContent className="ml-7">
				<p className="text-foreground line-clamp-2 text-sm">
					{data.subject || _(msg`Empty subject`)}
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

export const ActionEmailNode = memo(ActionEmailNodeComponent)
