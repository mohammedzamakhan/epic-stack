import { prisma } from '#app/utils/db.server.ts'
import { getSignedGetRequestInfo } from '#app/utils/storage.server.ts'
import { type Route } from './+types/mcp-tools.ts'

// Define Note type based on Prisma query result
type NoteData = {
	id: string
	title: string
	content: string
	createdAt: Date
	isPublic: boolean
}

async function validateApiKey(apiKey: string) {
	const apiKeyRecord = await prisma.apiKey.findUnique({
		where: { key: apiKey },
		include: { user: true, organization: true },
	})

	if (!apiKeyRecord) return null

	return {
		user: apiKeyRecord.user,
		organization: apiKeyRecord.organization,
	}
}

async function getUserBase64Image(imageObjectKey: string) {
	const { url: signedUrl, headers: signedHeaders } =
		getSignedGetRequestInfo(imageObjectKey)
	const response = await fetch(signedUrl, { headers: signedHeaders })
	const blob = await response.blob()
	const buffer = await blob.arrayBuffer()
	return Buffer.from(buffer).toString('base64')
}

// Types for tool definitions and requests
interface ToolDefinition {
	name: string
	title: string
	description: string
	inputSchema: {
		type: string
		properties: Record<string, any>
		required: string[]
	}
}

interface ToolRequest {
	tool: string
	args: Record<string, any>
}

// Tool definitions that will be returned to MCP clients
const TOOL_DEFINITIONS: ToolDefinition[] = [
	{
		name: 'find_user',
		title: 'Find users',
		description:
			'Search for users in your organization by their name or username',
		inputSchema: {
			type: 'object',
			properties: {
				query: {
					type: 'string',
					description: 'Search query for user name or username',
				},
			},
			required: ['query'],
		},
	},
	{
		name: 'get_user_notes',
		title: 'Get notes',
		description: 'Get the notes for a user in your organization',
		inputSchema: {
			type: 'object',
			properties: {
				username: {
					type: 'string',
					description: 'Username of the user whose notes to retrieve',
				},
			},
			required: ['username'],
		},
	},
]

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const apiKey = url.searchParams.get('apiKey')

	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'API key required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const authData = await validateApiKey(apiKey)
	if (!authData) {
		return new Response(JSON.stringify({ error: 'Invalid API key' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	// Return available tools
	return new Response(JSON.stringify({ tools: TOOL_DEFINITIONS }), {
		headers: { 'Content-Type': 'application/json' },
	})
}

export async function action({ request }: Route.ActionArgs) {
	const url = new URL(request.url)
	const apiKey = url.searchParams.get('apiKey')

	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'API key required' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const authData = await validateApiKey(apiKey)
	if (!authData) {
		return new Response(JSON.stringify({ error: 'Invalid API key' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	try {
		const body = (await request.json()) as ToolRequest
		const { tool, args } = body

		if (tool === 'find_user') {
			const { query } = args

			console.log(tool, query, body)

			const users = await prisma.user.findMany({
				where: {
					organizations: {
						some: {
							organizationId: authData.organization.id,
							active: true,
						},
					},
					OR: [
						{ name: { contains: query } },
						{ username: { contains: query } },
					],
				},
				select: {
					name: true,
					username: true,
					image: {
						select: {
							objectKey: true,
						},
					},
				},
				take: 10,
			})

			const content = []
			for (const user of users) {
				content.push({
					type: 'text',
					text: `${user.name} (${user.username})`,
				})

				if (user.image?.objectKey) {
					content.push({
						type: 'image',
						data: await getUserBase64Image(user.image.objectKey),
						mimeType: 'image/png',
					})
				}
			}

			if (!content.length) {
				content.push({
					type: 'text',
					text: 'No users found in your organization',
				})
			}

			return new Response(JSON.stringify({ content }), {
				headers: { 'Content-Type': 'application/json' },
			})
		}

		if (tool === 'get_user_notes') {
			const { username } = args

			const user = await prisma.user.findFirst({
				where: {
					username,
					organizations: {
						some: {
							organizationId: authData.organization.id,
							active: true,
						},
					},
				},
				select: {
					id: true,
					name: true,
					username: true,
				},
			})

			if (!user) {
				return new Response(
					JSON.stringify({
						content: [
							{ type: 'text', text: 'User not found in your organization' },
						],
					}),
					{
						headers: { 'Content-Type': 'application/json' },
					},
				)
			}

			const notes = await prisma.organizationNote.findMany({
				where: {
					organizationId: authData.organization.id,
					createdById: user.id,
					OR: [
						{ isPublic: true },
						{ createdById: authData.user.id },
						{ noteAccess: { some: { userId: authData.user.id } } },
					],
				},
				select: {
					id: true,
					title: true,
					content: true,
					createdAt: true,
					isPublic: true,
				},
				take: 10,
				orderBy: { createdAt: 'desc' },
			})

			if (!notes?.length) {
				return new Response(
					JSON.stringify({
						content: [
							{
								type: 'text',
								text: `No accessible notes found for ${user.name}`,
							},
						],
					}),
					{
						headers: { 'Content-Type': 'application/json' },
					},
				)
			}

			const content = notes.map((note) => ({
				type: 'text',
				text: `${note.title}\n\n${note.content}\n\n---\nCreated: ${note.createdAt.toLocaleDateString()}${note.isPublic ? '' : ' (Private)'}`,
			}))

			return new Response(JSON.stringify({ content }), {
				headers: { 'Content-Type': 'application/json' },
			})
		}

		return new Response(JSON.stringify({ error: 'Unknown tool' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		})
	} catch (error) {
		console.error('API error:', error)
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		})
	}
}
