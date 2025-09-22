/**
 * Extracts user mentions from comment content
 * Supports TipTap mention format with data-id attributes and fallback formats
 */
export function extractMentions(content: string): string[] {
    const mentions: string[] = []

    // First, try to extract user IDs from TipTap mention spans with data-id attributes
    // Look for spans that have both data-type="mention" and data-id attributes (in any order)
    const mentionSpanRegex = /<span[^>]*data-id="([^"]+)"[^>]*data-type="mention"[^>]*>|<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/g
    let match

    while ((match = mentionSpanRegex.exec(content)) !== null) {
        const userId = match[1] || match[2] // Either capture group could have the ID
        if (userId) {
            mentions.push(userId)
        }
    }

    // If we found TipTap mentions, return those (they're the most reliable)
    if (mentions.length > 0) {
        return [...new Set(mentions)]
    }

    // Fallback: Match @[User Name] format (with brackets)
    const bracketMentionRegex = /@\[([^\]]+)\]/g
    while ((match = bracketMentionRegex.exec(content)) !== null) {
        if (match[1]) {
            mentions.push(match[1])
        }
    }

    // Remove bracketed mentions from content to avoid double matching
    const contentWithoutBrackets = content.replace(/@\[([^\]]+)\]/g, '')

    // Fallback: Match @username or @userId patterns (no spaces, word characters only)
    const simpleMentionRegex = /@(\w+)/g
    while ((match = simpleMentionRegex.exec(contentWithoutBrackets)) !== null) {
        if (match[1]) {
            mentions.push(match[1])
        }
    }

    return [...new Set(mentions)] // Remove duplicates
}

/**
 * Resolves mention identifiers to user IDs
 * This function takes userIds/usernames/names and returns corresponding user IDs
 * Priority order: user ID > username > exact name > partial name
 */
export async function resolveMentionsToUserIds(
    mentions: string[],
    organizationMembers: Array<{
        userId: string
        user: {
            id: string
            name: string | null
            username: string
        }
    }>
): Promise<string[]> {
    const userIds: string[] = []

    for (const mention of mentions) {
        // First priority: Check if mention is already a user ID (most reliable)
        const userById = organizationMembers.find(
            member => member.user.id === mention
        )

        if (userById) {
            userIds.push(userById.user.id)
            continue
        }

        // Second priority: Try to find user by username (exact match)
        const userByUsername = organizationMembers.find(
            member => member.user.username === mention
        )

        if (userByUsername) {
            userIds.push(userByUsername.user.id)
            continue
        }

        // Third priority: Try to find user by exact name match
        const userByName = organizationMembers.find(
            member => member.user.name === mention
        )

        if (userByName) {
            userIds.push(userByName.user.id)
            continue
        }

        // Last resort: Try to find user by partial name match (case insensitive)
        const userByPartialName = organizationMembers.find(
            member => member.user.name &&
                member.user.name.toLowerCase().includes(mention.toLowerCase())
        )

        if (userByPartialName) {
            userIds.push(userByPartialName.user.id)
        }
    }

    return [...new Set(userIds)] // Remove duplicates
}