import { useCallback } from 'preact/hooks'
import type { JSX } from 'preact/jsx-runtime'
import { ToolbarRoot } from './ToolbarRoot'
import { ToolbarContainer } from './ToolbarContainer'
import { ToolbarButton } from './ToolbarButton'
import { ToolbarGroup } from './ToolbarGroup'
import { ToolbarSeparator } from './ToolbarSeparator'
import { RecordIcon, CommentIcon } from './icons'
import { useToolbarContext } from './context'

interface BugBasherToolbarProps {
	isRecording: boolean
	isCommenting: boolean
	onStartRecording: () => void
	onStopRecording: () => void
	onStartCommenting: () => void
	onStopCommenting: () => void
}

function ToolbarContent() {
	const {
		isRecording,
		isCommenting,
		onStartRecording,
		onStopRecording,
		onStartCommenting,
		onStopCommenting,
	} = useToolbarContext()

	const handleRecordClick = useCallback(
		(e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
			e.stopPropagation()
			if (isRecording) {
				onStopRecording()
			} else {
				onStartRecording()
			}
		},
		[isRecording, onStartRecording, onStopRecording],
	)

	const handleCommentClick = useCallback(
		(e: JSX.TargetedMouseEvent<HTMLButtonElement>) => {
			e.stopPropagation()
			if (isCommenting) {
				onStopCommenting()
			} else {
				onStartCommenting()
			}
		},
		[isCommenting, onStartCommenting, onStopCommenting],
	)

	return (
		<ToolbarContainer>
			<ToolbarGroup>
				<ToolbarButton
					variant={isRecording ? 'recording' : 'default'}
					onClick={handleRecordClick}
					icon={<RecordIcon />}
				>
					{isRecording ? 'Stop Recording' : 'Record'}
				</ToolbarButton>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup>
				<ToolbarButton
					variant={isCommenting ? 'commenting' : 'default'}
					onClick={handleCommentClick}
					icon={<CommentIcon />}
				/>
			</ToolbarGroup>
		</ToolbarContainer>
	)
}

export function BugBasherToolbar(props: BugBasherToolbarProps) {
	return (
		<ToolbarRoot {...props}>
			<ToolbarContent />
		</ToolbarRoot>
	)
}
