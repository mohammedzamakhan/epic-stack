/**
 * Welcome workflow for Novu notifications.
 * This is the workflow definition that will be used by the Novu framework.
 */

export interface WelcomeWorkflowPayload {
	userName?: string
	organizationName?: string
}

/**
 * Welcome workflow identifier that should match the workflow name in the Novu dashboard.
 */
export const WELCOME_WORKFLOW_ID = 'welcome-notification'

/**
 * This is just a definition of the workflow to be used in the app.
 * The actual implementation will be in the Novu dashboard or local studio.
 */
export type WelcomeWorkflow = {
	id: typeof WELCOME_WORKFLOW_ID
	payload: WelcomeWorkflowPayload
}
