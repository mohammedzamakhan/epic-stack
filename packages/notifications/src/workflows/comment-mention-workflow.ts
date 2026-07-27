import { createCommentNotificationWorkflow } from './comment-notification-template'

export const commentMentionWorkflow = createCommentNotificationWorkflow({
	workflowId: 'comment-mention-workflow',
	inAppStepId: 'comment-mention-notification',
	emailStepId: 'comment-mention-email',
	notificationType: 'comment-mention',
	inAppBodyTemplate: (payload) =>
		`${payload.commenterName} mentioned you in a comment on "${payload.noteTitle}"`,
	emailSubjectTemplate: (payload) =>
		`You were mentioned in a comment on "${payload.noteTitle}"`,
	emailHeading: 'You were mentioned in a comment',
	emailIntroTemplate: (payload) =>
		`<p><strong>${payload.commenterName}</strong> mentioned you in a comment on the note "<strong>${payload.noteTitle}</strong>".</p>`,
})
