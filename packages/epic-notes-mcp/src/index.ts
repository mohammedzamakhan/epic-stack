import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { brand } from '@repo/config/brand'

// Get API key from command line arguments
const API_KEY = process.argv[2]
if (!API_KEY) {
	console.error('Error: API key is required')
	console.error('Usage: npx epic-notes-mcp <api-key>')
	process.exit(1)
}

const SERVER_URL = 'http://localhost:3001/api/mcp-tools'

// Create a proxy server
const server = new McpServer(
	{
		name: 'epic-notes-proxy',
		title: `${brand.name} Proxy`,
		version: '1.0.0',
	},
	{
		capabilities: {
			tools: {},
		},
		instructions: `Lets you connect to ${brand.name} system`,
	},
)

// Types for tool definitions
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

interface ToolsResponse {
	tools: ToolDefinition[]
}

// Fetch available tools from the API
async function fetchAvailableTools(): Promise<ToolDefinition[]> {
	try {
		const response = await fetch(`${SERVER_URL}?apiKey=${API_KEY}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(
				`Failed to fetch tools: ${response.status} - ${errorText}`,
			)
		}

		const result = (await response.json()) as ToolsResponse
		return result.tools || []
	} catch (error: any) {
		console.error('Error fetching available tools:', error)
		throw error
	}
}

// Convert JSON Schema to Zod schema (for primitive types)
function jsonSchemaToZod(schema: any): z.ZodType<any> {
	if (schema.type === 'string') {
		return z.string()
	}
	if (schema.type === 'number') {
		return z.number()
	}
	if (schema.type === 'boolean') {
		return z.boolean()
	}
	if (schema.type === 'array') {
		const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.any()
		return z.array(itemSchema)
	}
	// Fallback for unknown types
	return z.any()
}

// Helper to call the simplified API
async function callRemoteTool(toolName: string, args: Record<string, any>) {
	try {
		const response = await fetch(`${SERVER_URL}?apiKey=${API_KEY}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				tool: toolName,
				args: args,
			}),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Server error: ${response.status} - ${errorText}`)
		}

		const result = (await response.json()) as any

		if (result.error) {
			throw new Error(result.error)
		}

		return result
	} catch (error: any) {
		return {
			content: [{ type: 'text', text: `Error: ${error.message}` }],
		}
	}
}

// Dynamically register tools from the API
async function registerDynamicTools() {
	const tools = await fetchAvailableTools()

	if (!Array.isArray(tools) || tools.length === 0) {
		return
	}

	for (const tool of tools) {
		try {
			// Create a Zod object schema from the JSON schema
			const shape: Record<string, z.ZodType<any>> = {}
			const required = tool.inputSchema.required || []

			for (const [key, value] of Object.entries(
				tool.inputSchema.properties || {},
			)) {
				let zodType = jsonSchemaToZod(value as any)

				// Make optional if not in required array
				if (!required.includes(key)) {
					zodType = zodType.optional()
				}

				shape[key] = zodType
			}

			server.registerTool(
				tool.name,
				{
					title: tool.title,
					description: tool.description,
					inputSchema: shape,
				},
				async (args: any) => callRemoteTool(tool.name, args),
			)
		} catch (toolError) {
			console.error(`Failed to register tool ${tool.name}:`, toolError)
		}
	}
}

async function main() {
	// Register tools dynamically before connecting
	await registerDynamicTools()

	const transport = new StdioServerTransport()
	await server.connect(transport)
}

main().catch((error) => {
	console.error('Failed to start MCP proxy:', error)
	process.exit(1)
})
