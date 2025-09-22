import { workflow } from '@novu/framework'
import z from 'zod'

export const commentMentionWorkflow = workflow(
	'comment-mention-workflow',
	async ({ step, payload }) => {
		await step.inApp('comment-mention-notification', async () => {
			return {
				body: `${payload.commenterName} mentioned you in a comment on "${payload.noteTitle}"`,
				data: {
					noteId: payload.noteId,
					commentId: payload.commentId,
					organizationSlug: payload.organizationSlug,
					type: 'comment-mention',
				},
                primaryAction: {
                    label: 'View Comment',
                    redirect: {
                        target: '_self',
                        url: payload.noteUrl
                    }
                }
			}
		})

		await step.email('comment-mention-email', async () => {
			return {
				subject: `You were mentioned in a comment on "${payload.noteTitle}"`,
				body: `
					<h2>You were mentioned in a comment</h2>
					<p><strong>${payload.commenterName}</strong> mentioned you in a comment on the note "<strong>${payload.noteTitle}</strong>".</p>
					<p><strong>Comment:</strong></p>
					<blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 16px 0; color: #6b7280;">
						${payload.commentContent}
					</blockquote>
					<p>
						<a href="${payload.noteUrl}" style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
							View Comment
						</a>
					</p>
				`,
			}
		})
	},
    {
        payloadSchema: z.object({
            noteId: z.string(),
            noteTitle: z.string(),
            noteUrl: z.string(),
            commentId: z.string(),
            commenterName: z.string(),
            commentContent: z.string(),
            organizationSlug: z.string(),
        }),
    }
)