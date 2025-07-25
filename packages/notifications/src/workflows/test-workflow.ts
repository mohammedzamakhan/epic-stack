import { workflow } from '@novu/framework'

export interface TestWorkflowPayload {
	name?: string
}

/**
 * Test workflow identifier that should match the workflow name in the Novu dashboard.
 */
export const TEST_WORKFLOW_ID = 'test-workflow'

/**
 * This is just a definition of the workflow to be used in the app.
 * The actual implementation will be in the Novu dashboard or local studio.
 */
export type TestWorkflow = {
	id: typeof TEST_WORKFLOW_ID
	payload: TestWorkflowPayload
}

export const testWorkflow = workflow('test-workflow', async ({ step }) => {
	await step.email('test-email', async () => {
		return {
			subject: 'Test Email',
			body: 'This is a test email from Novu Framework!',
		}
	})
})
