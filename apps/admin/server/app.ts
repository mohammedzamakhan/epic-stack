import 'react-router'
import { createRequestHandler } from '@react-router/express'
import express from 'express'
import { serverBuildContext } from '../app/server-context.ts'

export const app = express()

app.use(
	createRequestHandler({
		mode: process.env.NODE_ENV ?? 'development',
		build: () => import('virtual:react-router/server-build'),
		getLoadContext: async () => {
			const RR = await new Function("return import('react-router')")()
			const ctx = new RR.RouterContextProvider()
			ctx.set(
				serverBuildContext,
				await import('virtual:react-router/server-build'),
			)
			return ctx
		},
	}),
)
