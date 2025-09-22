import { Novu } from '@novu/api'
import { extractMentions, resolveMentionsToUserIds } from '@repo/notifications'
import { prisma } from './db.server'

const novu = new Novu({
    secretKey: process.env.NOVU_SECRET_KEY,
})

interface NotifyCommentMentionsParams {
    commentContent: string
    commentId: string
    noteId: string
    noteTitle: string
    commenterUserId: string
    commenterName: string
    organizationId: string
    organizationSlug: string
}

interface NotifyNoteOwnerParams {
    noteId: string
    noteTitle: string
    noteOwnerId: string
    commentId: string
    commenterUserId: string
    commenterName: string
    commentContent: string
    organizationId: string
    organizationSlug: string
}

/**
 * Sends notifications to users mentioned in a comment
 */
export async function notifyCommentMentions({
    commentContent,
    commentId,
    noteId,
    noteTitle,
    commenterUserId,
    commenterName,
    organizationId,
    organizationSlug,
}: NotifyCommentMentionsParams) {
    try {
        console.log('notifyCommentMentions called with:', {
            noteTitle,
            commenterName,
            commenterUserId,
            organizationSlug,
            noteId,
            commentId
        })

        // Extract mentions from comment content
        const mentions = extractMentions(commentContent)

        if (mentions.length === 0) {
            return
        }

        // Get organization members to resolve mentions
        const organizationMembers = await prisma.userOrganization.findMany({
            where: {
                organizationId,
                active: true,
            },
            select: {
                userId: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                    },
                },
            },
        })

        // Resolve mentions to user IDs
        const mentionedUserIds = await resolveMentionsToUserIds(mentions, organizationMembers)

        // Filter out the commenter (don't notify yourself)
        const filteredUserIds = mentionedUserIds.filter((userId: string) => userId !== commenterUserId)

        if (filteredUserIds.length === 0) {
            return
        }

        // Send notifications to mentioned users
        const noteUrl = `/${organizationSlug}/notes/${noteId}`

        for (const userId of filteredUserIds) {
            const user = organizationMembers.find(member => member.user.id === userId)?.user
            if (!user) continue

            const subscriberId = `${organizationId}_${userId}`

            const payload = {
                noteId,
                commentId,
                noteTitle,
                commenterName,
                commentContent,
                organizationSlug,
                noteUrl,
            }

            await novu.trigger({
                workflowId: 'comment-mention-workflow',
                to: {
                    subscriberId,
                    email: user.email,
                },
                payload,
            })
        }

        console.log(`Sent mention notifications to ${filteredUserIds.length} users`)
    } catch (error) {
        console.error('Error sending mention notifications:', error)
    }
}

/**
 * Sends notification to note owner when someone comments on their note
 */
export async function notifyNoteOwner({
    noteId,
    noteTitle,
    noteOwnerId,
    commentId,
    commenterUserId,
    commenterName,
    commentContent,
    organizationId,
    organizationSlug,
}: NotifyNoteOwnerParams) {
    try {
        // Don't notify if the commenter is the note owner
        if (commenterUserId === noteOwnerId) {
            return
        }

        // Get note owner's email
        const noteOwner = await prisma.user.findUnique({
            where: { id: noteOwnerId },
            select: { email: true },
        })

        if (!noteOwner) {
            console.error('Note owner not found:', noteOwnerId)
            return
        }

        const subscriberId = `${organizationId}_${noteOwnerId}`
        const noteUrl = `/${organizationSlug}/notes/${noteId}`

        await novu.trigger({
            workflowId: 'note-comment-workflow',
            to: {
                subscriberId: subscriberId,
                email: noteOwner.email,
            },
            payload: {
                noteId,
                commentId,
                noteTitle,
                commenterName,
                commentContent,
                organizationSlug,
                noteUrl,
            },
        })

        console.log(`Sent note comment notification to note owner: ${noteOwnerId}`)
    } catch (error) {
        console.error('Error sending note owner notification:', error)
    }
}