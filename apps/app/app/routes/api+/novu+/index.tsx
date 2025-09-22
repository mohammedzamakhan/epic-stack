import { serve } from '@novu/framework/remix'
import { testWorkflow, commentMentionWorkflow, noteCommentWorkflow } from '@repo/notifications'

const handler = serve({
	workflows: [testWorkflow, commentMentionWorkflow, noteCommentWorkflow],
})

export { handler as action, handler as loader }
