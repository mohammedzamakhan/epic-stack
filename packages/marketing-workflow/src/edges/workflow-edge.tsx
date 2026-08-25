import { cn } from '@repo/ui'
import {
	BaseEdge,
	EdgeLabelRenderer,
	getSmoothStepPath,
	useReactFlow,
	Position,
	type EdgeProps,
} from '@xyflow/react'
import React, { memo } from 'react'
import { type AppFlowEdge } from '../types.ts'

function WorkflowEdgeComponent({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition = Position.Bottom,
	targetPosition = Position.Top,
	style = {},
	markerEnd,
	selected,
	sourceHandleId,
	data,
}: EdgeProps<AppFlowEdge>) {
	const { setEdges } = useReactFlow()
	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
		borderRadius: 16,
	})

	const isTrueBranch = sourceHandleId === 'true'
	const isFalseBranch = sourceHandleId === 'false'
	const customLabel =
		data?.label || (isTrueBranch ? 'True' : isFalseBranch ? 'False' : null)

	const onEdgeClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		setEdges((edges) => edges.filter((edge) => edge.id !== id))
	}

	return (
		<>
			<BaseEdge
				path={edgePath}
				markerEnd={markerEnd}
				style={{
					strokeWidth: selected ? 2.5 : 2,
					stroke: isTrueBranch
						? 'rgb(16, 185, 129)'
						: isFalseBranch
							? 'rgb(244, 63, 94)'
							: selected
								? '#3b82f6'
								: '#94a3b8',
					...style,
				}}
			/>

			<EdgeLabelRenderer>
				<div
					style={{
						position: 'absolute',
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						pointerEvents: 'all',
					}}
					className="nodrag nopan group flex items-center gap-1"
				>
					{customLabel && (
						<span
							className={cn(
								'rounded-full border px-2 py-0.5 text-[10px] font-bold shadow-xs transition-all',
								isTrueBranch &&
									'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
								isFalseBranch &&
									'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
								!isTrueBranch &&
									!isFalseBranch &&
									'bg-card text-muted-foreground border-border',
							)}
						>
							{customLabel}
						</span>
					)}

					<button
						type="button"
						className={cn(
							'bg-background border-border/80 text-muted-foreground hover:text-destructive hover:border-destructive size-5 rounded-full border shadow-xs',
							'flex items-center justify-center opacity-0 transition-all group-hover:opacity-100',
							selected && 'opacity-100',
						)}
						onClick={onEdgeClick}
						title="Delete connection"
						aria-label="Delete edge"
					>
						<svg
							className="size-3"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			</EdgeLabelRenderer>
		</>
	)
}

export const WorkflowEdge = memo(WorkflowEdgeComponent)
