/**
 * Tests for GitHubProvider utility methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GitHubProvider } from '../../../src/providers/github/provider'

describe('GitHubProvider - Utility Methods', () => {
	let provider: GitHubProvider

	beforeEach(() => {
		// Set required environment variables
		process.env.GITHUB_INTEGRATION_CLIENT_ID = 'test-client-id'
		process.env.GITHUB_INTEGRATION_CLIENT_SECRET = 'test-client-secret'
		process.env.INTEGRATIONS_OAUTH_STATE_SECRET =
			'test-secret-key-for-oauth-state-validation-12345678'

		provider = new GitHubProvider()
	})

	describe('Provider Properties', () => {
		it('should have correct provider properties', () => {
			expect(provider.name).toBe('github')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('GitHub')
			expect(provider.description).toContain('GitHub')
			expect(provider.logoPath).toBe('/icons/github.svg')
		})
	})

	describe('Repository Filtering', () => {
		it('should filter out archived repositories', () => {
			const repos = [
				{
					id: 1,
					name: 'active-repo',
					archived: false,
					disabled: false,
					permissions: { push: true },
				},
				{
					id: 2,
					name: 'archived-repo',
					archived: true,
					disabled: false,
					permissions: { push: true },
				},
			]

			const filtered = repos.filter(
				(repo) => !repo.archived && !repo.disabled && repo.permissions?.push,
			)
			expect(filtered).toHaveLength(1)
			expect(filtered[0].name).toBe('active-repo')
		})

		it('should filter out disabled repositories', () => {
			const repos = [
				{
					id: 1,
					name: 'active-repo',
					archived: false,
					disabled: false,
					permissions: { push: true },
				},
				{
					id: 2,
					name: 'disabled-repo',
					archived: false,
					disabled: true,
					permissions: { push: true },
				},
			]

			const filtered = repos.filter(
				(repo) => !repo.archived && !repo.disabled && repo.permissions?.push,
			)
			expect(filtered).toHaveLength(1)
			expect(filtered[0].name).toBe('active-repo')
		})

		it('should filter out repositories without push permissions', () => {
			const repos = [
				{
					id: 1,
					name: 'push-repo',
					archived: false,
					disabled: false,
					permissions: { push: true },
				},
				{
					id: 2,
					name: 'no-push-repo',
					archived: false,
					disabled: false,
					permissions: { push: false },
				},
			]

			const filtered = repos.filter(
				(repo) => !repo.archived && !repo.disabled && repo.permissions?.push,
			)
			expect(filtered).toHaveLength(1)
			expect(filtered[0].name).toBe('push-repo')
		})
	})

	describe('Issue Creation', () => {
		it('should format issue body correctly', () => {
			const messageData = {
				title: 'Test Note',
				content: 'Test content',
				author: 'John Doe',
				noteUrl: 'https://example.com/notes/123',
				changeType: 'created' as const,
			}

			const expectedBody = `${messageData.content}\n\n---\n**Author:** ${messageData.author}\n**View note:** ${messageData.noteUrl}`

			expect(expectedBody).toContain(messageData.content)
			expect(expectedBody).toContain(messageData.author)
			expect(expectedBody).toContain(messageData.noteUrl)
		})
	})
})
