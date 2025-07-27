import { workflow } from '@novu/framework'

export const testWorkflow = workflow('test-workflow', async ({ step }) => {
	await step.inApp('test-in-app', async () => {
		return {
			body: 'This is a test in-app notification from Novu Framework!',
		}
	})
})
