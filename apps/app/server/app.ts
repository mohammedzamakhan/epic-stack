import 'react-router'
import { createRequestHandler } from '@react-router/express'
import express from 'express'
import { ensureLinguiRequestLocale } from '../app/modules/lingui/lingui.server.ts'
import { serverBuildContext } from '../app/server-context.ts'

export const app = express()
app.set('trust proxy', true)

function createWebRequest(req: express.Request): Request {
	const host = req.get('host') ?? 'localhost'
	const url = new URL(`${req.protocol}://${host}${req.originalUrl}`)
	const headers = new Headers()
	for (const [key, value] of Object.entries(req.headers)) {
		if (!value) continue
		if (Array.isArray(value)) {
			for (const entry of value) headers.append(key, entry)
		} else {
			headers.set(key, value)
		}
	}
	return new Request(url, { method: req.method, headers })
}

const reactRouterHandler = createRequestHandler({
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
})

app.use(async (req, res, next) => {
	try {
		await ensureLinguiRequestLocale(createWebRequest(req))
		return reactRouterHandler(req, res, next)
	} catch (error) {
		next(error)
	}
})
