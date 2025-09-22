import { extractMentions, resolveMentionsToUserIds } from './mention-parser'

// Example usage and test cases
const testContent = `
Hey @john, can you review this? 
Also @[Jane Doe] might be interested.
CC: @alice @bob
`

const mentions = extractMentions(testContent)
console.log('Extracted mentions:', mentions)
// Output: ['john', 'Jane Doe', 'alice', 'bob']

const mockOrganizationMembers = [
	{
		userId: 'user-1',
		user: {
			id: 'user-1',
			name: 'John Smith',
			username: 'john',
		},
	},
	{
		userId: 'user-2',
		user: {
			id: 'user-2',
			name: 'Jane Doe',
			username: 'jane',
		},
	},
	{
		userId: 'user-3',
		user: {
			id: 'user-3',
			name: 'Alice Johnson',
			username: 'alice',
		},
	},
]

// Example of resolving mentions
async function testResolution() {
	const userIds = await resolveMentionsToUserIds(mentions, mockOrganizationMembers)
	console.log('Resolved user IDs:', userIds)
	// Output: ['user-1', 'user-2', 'user-3']
}

export { testResolution }