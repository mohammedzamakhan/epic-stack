import 'varlock/auto-load'
import { ENV } from 'varlock/env'

import { ffmpeg, additionalFiles } from '@trigger.dev/build/extensions/core'
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
	project: ENV.TRIGGER_PROJECT_ID,
	build: {
		extensions: [
			ffmpeg(),
			additionalFiles({
				files: [
					'./../../node_modules/.prisma/client/**/*',
					'./../../node_modules/@prisma/client/**/*',
				],
			}),
		],
	},
	dirs: ['./../../packages/background-jobs/src/tasks'],
	maxDuration: 5000,
})
