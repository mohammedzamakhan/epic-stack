import { workflow } from '@novu/framework'
import z from 'zod'

export const noteCommentWorkflow = workflow(
    'note-comment-workflow',
    async ({ step, payload }) => {
        await step.inApp('note-comment-notification', async () => {
            return {
                body: `${payload.commenterName} commented on your note "${payload.noteTitle}"`,
                data: {
                    noteId: payload.noteId,
                    commentId: payload.commentId,
                    organizationSlug: payload.organizationSlug,
                    type: 'note-comment',
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

        await step.email('note-comment-email', async () => {
            return {
                subject: `New comment on your note "${payload.noteTitle}"`,
                body: `
					<h2>New comment on your note</h2>
					<p><strong>${payload.commenterName}</strong> left a comment on your note "<strong>${payload.noteTitle}</strong>".</p>
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