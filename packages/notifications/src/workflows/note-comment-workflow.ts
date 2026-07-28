import { createCommentNotificationWorkflow } from './comment-notification-template'

export const noteCommentWorkflow = createCommentNotificationWorkflow({
	workflowId: 'note-comment-workflow',
	inAppStepId: 'note-comment-notification',
	emailStepId: 'note-comment-email',
	notificationType: 'note-comment',
	inAppBodyTemplate: (payload) =>
		`${payload.commenterName} commented on your note "${payload.noteTitle}"`,
	emailSubjectTemplate: (payload) =>
		`New comment on your note "${payload.noteTitle}"`,
	emailHeading: 'New comment on your note',
	emailIntroTemplate: (payload) =>
		`<p><strong>${payload.commenterName}</strong> left a comment on your note "<strong>${payload.noteTitle}</strong>".</p>`,
})
