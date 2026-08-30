import { handleChat } from '@repo/ai/route-handlers'
import { createChatStream, buildNoteChatSystemPrompt } from '@repo/ai/server'
import { requireUserId } from '@repo/auth'
import { markStepCompleted } from '@repo/common/onboarding'
import { brand } from '@repo/config/brand'
import { type ActionFunctionArgs } from 'react-router'
import {
	requireUserWithOrganizationPermission,
	ORG_PERMISSIONS,
} from '#app/utils/organization/permissions.server.ts'
import { db, WebsitePage, WebsitePageSection, eq } from '@repo/database'
import { z } from 'zod'

const getPageEditorTools = () =>
	({
		addSection: {
			description:
				'Add a new section (block) to the website page. Valid types: hero, content, gallery, testimonials, faq, cta, features, cards, video, blank, article, showcase.',
			parameters: z.object({
				type: z
					.string()
					.describe('The type of section to add, e.g., hero, features, faq'),
				position: z
					.number()
					.describe('The 0-based position to insert the section at'),
			}),
		},
		updateSection: {
			description:
				'Update the JSON configuration of an existing section. Use this when the user asks to modify the content of a specific section.',
			parameters: z.object({
				sectionId: z.string().describe('The ID of the section to update'),
				config: z
					.string()
					.describe(
						'The complete JSON string of the new section configuration',
					),
			}),
		},
		removeSection: {
			description: 'Remove an existing section from the page',
			parameters: z.object({
				sectionId: z.string().describe('The ID of the section to remove'),
			}),
		},
	}) as Record<string, any>

const buildPageEditorSystemPrompt = (
	basePrompt: string,
	pageContext: any,
) => `${basePrompt}

You are assisting the user in designing and editing their website page. 
You can use tools to add, modify, or remove sections on the page. 
When asked to make a change, use the appropriate tool. 
If modifying an existing section, use the exact section ID from the current page state.

Current Page State:
Title: ${pageContext.title}
Slug: ${pageContext.slug}

Current Sections (ordered by position):
${pageContext.sections.map((s: any, idx: number) => `- Position: ${idx}, ID: ${s.id}, Type: ${s.type}, Config: ${s.config}`).join('\n')}
`

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export const action = async (args: ActionFunctionArgs) => {
	return handleChat(args, {
		requireUserId,
		requireOrgMembership: (request, organizationId) =>
			requireUserWithOrganizationPermission(
				request,
				organizationId,
				ORG_PERMISSIONS.READ_NOTE_OWN,
			),
		createChatStream,
		buildNoteChatSystemPrompt,
		buildPageEditorSystemPrompt,
		brandSystemPrompt: brand.ai.systemPrompt,
		getPageEditorTools,
		getPageContext: async (pageId) => {
			const [page] = await db
				.select({ title: WebsitePage.title, slug: WebsitePage.slug })
				.from(WebsitePage)
				.where(eq(WebsitePage.id, pageId))
				.limit(1)

			const sections = await db
				.select({
					id: WebsitePageSection.id,
					type: WebsitePageSection.type,
					config: WebsitePageSection.config,
					position: WebsitePageSection.position,
				})
				.from(WebsitePageSection)
				.where(eq(WebsitePageSection.pageId, pageId))

			sections.sort((a, b) => a.position - b.position)

			return {
				...page,
				sections,
			}
		},
		markStepCompleted,
	})
}
