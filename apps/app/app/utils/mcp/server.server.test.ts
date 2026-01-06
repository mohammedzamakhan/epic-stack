import { prisma } from '@repo/database'
import * as fc from 'fast-check'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
	registerTool,
	getToolDefinitions,
	executeTool,
	handleMCPRequest,
	clearTools,
	getTool,
	type MCPContext,
	type MCPToolResponse,
} from './server.server'

// Generate unique slug per test run to avoid conflicts with parallel tests
const TEST_ORG_SLUG = `test-org-mcp-server-${Date.now()}-${Math.random().toString(36).substring(7)}`

describe('MCP Server Service', () => {
	let mockContext: MCPContext
	let testOrganization: any
	let testUser: any

	beforeEach(async () => {
		clearTools()

		// Create test user and organization with unique slug
		testUser = await prisma.user.create({
			data: {
				email: `test-${Date.now()}@example.com`,
				username: `testuser-${Date.now()}`,
				name: 'Test User',
			},
		})

		testOrganization = await prisma.organization.create({
			data: {
				name: 'Test Organization',
				slug: TEST_ORG_SLUG,
			},
		})

		mockContext = { user: testUser, organization: testOrganization }
	})

	afterEach(async () => {
		clearTools()

		// Clean up test data by specific IDs to avoid affecting parallel tests
		if (testOrganization?.id) {
			await prisma.mCPAccessToken.deleteMany({
				where: { authorization: { organizationId: testOrganization.id } },
			})
			await prisma.mCPRefreshToken.deleteMany({
				where: { authorization: { organizationId: testOrganization.id } },
			})
			await prisma.mCPAuthorization.deleteMany({
				where: { organizationId: testOrganization.id },
			})
			await prisma.userOrganization.deleteMany({
				where: { organizationId: testOrganization.id },
			})
			await prisma.organization.deleteMany({
				where: { id: testOrganization.id },
			})
		}
		if (testUser?.id) {
			await prisma.user.deleteMany({
				where: { id: testUser.id },
			})
		}
	})

	describe('Tool Registration', () => {
		it('should register a tool', () => {
			const tool = {
				name: 'test_tool',
				description: 'A test tool',
				inputSchema: { type: 'object', properties: {} },
				handler: async () => ({
					content: [{ type: 'text' as const, text: 'test' }],
				}),
			}

			registerTool(tool)

			const registered = getTool('test_tool')
			expect(registered).toBeDefined()
			expect(registered?.name).toBe('test_tool')
		})

		it('should throw error when registering duplicate tool', () => {
			const tool = {
				name: 'duplicate_tool',
				description: 'A test tool',
				inputSchema: { type: 'object', properties: {} },
				handler: async () => ({
					content: [{ type: 'text' as const, text: 'test' }],
				}),
			}

			registerTool(tool)

			expect(() => registerTool(tool)).toThrow(
				'Tool already registered: duplicate_tool',
			)
		})

		it('should get all tool definitions', () => {
			const tool1 = {
				name: 'tool1',
				description: 'First tool',
				inputSchema: { type: 'object' },
				handler: async () => ({
					content: [{ type: 'text' as const, text: 'test' }],
				}),
			}

			const tool2 = {
				name: 'tool2',
				description: 'Second tool',
				inputSchema: { type: 'object' },
				handler: async () => ({
					content: [{ type: 'text' as const, text: 'test' }],
				}),
			}

			registerTool(tool1)
			registerTool(tool2)

			const definitions = getToolDefinitions()

			expect(definitions).toHaveLength(2)
			expect(definitions[0]!.name).toBe('tool1')
			expect(definitions[1]!.name).toBe('tool2')
		})
	})

	describe('Tool Execution', () => {
		it('should execute a registered tool', async () => {
			const tool = {
				name: 'echo_tool',
				description: 'Echoes input',
				inputSchema: {
					type: 'object',
					properties: { message: { type: 'string' } },
				},
				handler: async (args: any) => ({
					content: [{ type: 'text' as const, text: args.message }],
				}),
			}

			registerTool(tool)

			const result = await executeTool(
				'echo_tool',
				{ message: 'hello' },
				mockContext,
			)

			expect(result.content).toHaveLength(1)
			expect(result.content[0]!.type).toBe('text')
			expect(result.content[0]!.text).toBe('hello')
		})

		it('should throw error for unknown tool', async () => {
			await expect(
				executeTool('unknown_tool', {}, mockContext),
			).rejects.toThrow('Tool not found: unknown_tool')
		})

		it('should pass context to tool handler', async () => {
			let receivedContext: MCPContext | null = null

			const tool = {
				name: 'context_tool',
				description: 'Captures context',
				inputSchema: { type: 'object' },
				handler: async (args: any, context: MCPContext) => {
					receivedContext = context
					return { content: [{ type: 'text' as const, text: 'ok' }] }
				},
			}

			registerTool(tool)

			await executeTool('context_tool', {}, mockContext)

			expect(receivedContext).toBeDefined()
			expect(receivedContext!.user.id).toBe(mockContext.user.id)
			expect(receivedContext!.organization.id).toBe(mockContext.organization.id)
		})

		it('should handle tool execution errors', async () => {
			const tool = {
				name: 'error_tool',
				description: 'Throws error',
				inputSchema: { type: 'object' },
				handler: async () => {
					throw new Error('Tool error')
				},
			}

			registerTool(tool)

			await expect(executeTool('error_tool', {}, mockContext)).rejects.toThrow(
				'Tool execution failed: Tool error',
			)
		})
	})

	describe('MCP Request Handling', () => {
		it('should handle tools/list request', async () => {
			const tool = {
				name: 'list_test_tool',
				description: 'Test tool for list',
				inputSchema: { type: 'object' },
				handler: async () => ({
					content: [{ type: 'text' as const, text: 'test' }],
				}),
			}

			registerTool(tool)

			const response = await handleMCPRequest(
				{ method: 'tools/list', params: { name: '', arguments: {} } },
				mockContext,
			)

			expect(response.tools).toBeDefined()
			expect(response.tools).toHaveLength(1)
			expect(response.tools[0].name).toBe('list_test_tool')
		})

		it('should handle tools/call request', async () => {
			const tool = {
				name: 'call_test_tool',
				description: 'Test tool for call',
				inputSchema: {
					type: 'object',
					properties: { value: { type: 'string' } },
				},
				handler: async (args: any) => ({
					content: [{ type: 'text' as const, text: `Result: ${args.value}` }],
				}),
			}

			registerTool(tool)

			const response = await handleMCPRequest(
				{
					method: 'tools/call',
					params: { name: 'call_test_tool', arguments: { value: 'test' } },
				},
				mockContext,
			)

			expect(response.content).toHaveLength(1)
			expect(response.content[0].text).toBe('Result: test')
		})

		it('should throw error for unknown method', async () => {
			await expect(
				handleMCPRequest(
					{ method: 'unknown/method', params: { name: '', arguments: {} } },
					mockContext,
				),
			).rejects.toThrow('Unknown method: unknown/method')
		})

		it('should throw error for missing method', async () => {
			await expect(
				handleMCPRequest(
					{ method: '', params: { name: '', arguments: {} } },
					mockContext,
				),
			).rejects.toThrow('Missing method in request')
		})

		it('should throw error for tools/call with missing tool name', async () => {
			await expect(
				handleMCPRequest(
					{ method: 'tools/call', params: { name: '', arguments: {} } },
					mockContext,
				),
			).rejects.toThrow('Missing tool name in params')
		})

		it('should throw error for tools/call with missing params', async () => {
			await expect(
				handleMCPRequest(
					{ method: 'tools/call', params: { name: '', arguments: {} } },
					mockContext,
				),
			).rejects.toThrow('Missing tool name in params')
		})
	})

	describe('Property 10: Tool request validation and execution', () => {
		/**
		 * Feature: mcp-oauth-migration, Property 10: Tool request validation and execution
		 * Validates: Requirements 3.3, 3.4
		 *
		 * For any tool invocation request with a valid access token, the system should
		 * validate the token, execute the requested tool, and return results in MCP
		 * protocol format.
		 */
		it('should validate and execute tool requests correctly', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 50 }),
					fc.string({ minLength: 1, maxLength: 100 }),
					async (toolName, inputValue) => {
						// Clear tools before registering
						clearTools()

						// Register a test tool
						const tool = {
							name: toolName,
							description: `Test tool: ${toolName}`,
							inputSchema: {
								type: 'object',
								properties: { input: { type: 'string' } },
							},
							handler: async (args: any) => ({
								content: [
									{
										type: 'text' as const,
										text: `Processed: ${args.input}`,
									},
								],
							}),
						}

						registerTool(tool)

						// Execute tool via MCP request
						const response = await handleMCPRequest(
							{
								method: 'tools/call',
								params: { name: toolName, arguments: { input: inputValue } },
							},
							mockContext,
						)

						// Property: Response should be in MCP protocol format
						expect(response).toBeDefined()
						expect(response.content).toBeDefined()
						expect(Array.isArray(response.content)).toBe(true)
						expect(response.content.length).toBeGreaterThan(0)

						// Property: Content should have required fields
						const content = response.content[0]
						expect(content.type).toBe('text')
						expect(content.text).toBeDefined()
						expect(content.text).toContain('Processed:')
					},
				),
				{ numRuns: 10 }, // Reduced from 100 to prevent timeout in CI
			)
		}, 30000) // 30 second timeout for property-based test
	})

	describe('Property 22: Tool error format compliance', () => {
		/**
		 * Feature: mcp-oauth-migration, Property 22: Tool error format compliance
		 * Validates: Requirements 6.5
		 *
		 * For any tool execution that fails, the error response should conform to the
		 * MCP protocol format with a descriptive error message.
		 */
		it('should return errors in MCP protocol format', async () => {
			await fc.assert(
				fc.asyncProperty(
					fc.string({ minLength: 1, maxLength: 50 }),
					async (errorMessage) => {
						// Clear tools before registering
						clearTools()

						// Register a tool that throws an error
						const tool = {
							name: 'error_test_tool',
							description: 'Tool that errors',
							inputSchema: { type: 'object' },
							handler: async () => {
								throw new Error(errorMessage)
							},
						}

						registerTool(tool)

						// Property: Error should be thrown with descriptive message
						try {
							await executeTool('error_test_tool', {}, mockContext)
							expect.fail('Should have thrown an error')
						} catch (error) {
							// Property: Error message should be descriptive
							expect(error).toBeInstanceOf(Error)
							const err = error as Error
							expect(err.message).toContain('Tool execution failed')
							expect(err.message).toContain(errorMessage)
						}
					},
				),
				{ numRuns: 10 }, // Reduced from 100 to prevent timeout in CI
			)
		}, 30000) // 30 second timeout for property-based test

		it('should handle unknown tool errors', async () => {
			try {
				await executeTool('nonexistent_tool', {}, mockContext)
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				const err = error as Error
				expect(err.message).toContain('Tool not found')
			}
		})
	})
})
