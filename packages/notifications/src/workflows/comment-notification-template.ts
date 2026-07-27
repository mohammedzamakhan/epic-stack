import { workflow } from '@novu/framework'
import z from 'zod'

/**
 * Shared payload schema for comment-related notification workflows.
 * Used by both note-comment-workflow and comment-mention-workflow.
 */
export const commentNotificationPayloadSchema = z.object({
	noteId: z.string(),
	noteTitle: z.string(),
	noteUrl: z.string(),
	commentId: z.string(),
	commenterName: z.string(),
	commentContent: z.string(),
	organizationSlug: z.string(),
})

export type CommentNotificationPayload = z.infer<
	typeof commentNotificationPayloadSchema
>

/**
 * Shared email HTML shell for comment notifications.
 * Wraps the given heading and body HTML with the standard blockquote style
 * and action button used in both comment notification emails.
 */
export function emailShell({
	heading,
	introHtml,
	commentContent,
	noteUrl,
	buttonLabel = 'View Comment',
}: {
	heading: string
	introHtml: string
	commentContent: string
	noteUrl: string
	buttonLabel?: string
}): string {
	return `
		<h2>${heading}</h2>
		${introHtml}
		<p><strong>Comment:</strong></p>
		<blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 16px 0; color: #6b7280;">
			${commentContent}
		</blockquote>
		<p>
			<a href="${noteUrl}" style="background-color: #3b82f6; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">
				${buttonLabel}
			</a>
		</p>
	`
}

/**
 * Shared inApp step payload builder for comment notifications.
 */
export function inAppPayload({
	body,
	noteId,
	commentId,
	organizationSlug,
	type,
	noteUrl,
}: {
	body: string
	noteId: string
	commentId: string
	organizationSlug: string
	type: 'note-comment' | 'comment-mention'
	noteUrl: string
}) {
	return {
		body,
		data: {
			noteId,
			commentId,
			organizationSlug,
			type,
		},
		primaryAction: {
			label: 'View Comment',
			redirect: {
				target: '_self' as const,
				url: noteUrl,
			},
		},
	}
}

/**
 * Factory function to create a comment-style Novu workflow with shared
 * inApp + email structure. Each workflow passes its distinct copy
 * (body sentence, email subject, heading, type) and the template handles
 * the rest.
 */
export function createCommentNotificationWorkflow({
	workflowId,
	inAppStepId,
	emailStepId,
	inAppBodyTemplate,
	emailSubjectTemplate,
	emailHeading,
	emailIntroTemplate,
	notificationType,
}: {
	workflowId: string
	inAppStepId: string
	emailStepId: string
	inAppBodyTemplate: (payload: CommentNotificationPayload) => string
	emailSubjectTemplate: (payload: CommentNotificationPayload) => string
	emailHeading: string
	emailIntroTemplate: (payload: CommentNotificationPayload) => string
	notificationType: 'note-comment' | 'comment-mention'
}) {
	return workflow(
		workflowId,
		async ({ step, payload }) => {
			await step.inApp(inAppStepId, async () => {
				return inAppPayload({
					body: inAppBodyTemplate(payload),
					noteId: payload.noteId,
					commentId: payload.commentId,
					organizationSlug: payload.organizationSlug,
					type: notificationType,
					noteUrl: payload.noteUrl,
				})
			})

			await step.email(emailStepId, async () => {
				return {
					subject: emailSubjectTemplate(payload),
					body: emailShell({
						heading: emailHeading,
						introHtml: emailIntroTemplate(payload),
						commentContent: payload.commentContent,
						noteUrl: payload.noteUrl,
					}),
				}
			})
		},
		{
			payloadSchema: commentNotificationPayloadSchema,
		},
	)
}
