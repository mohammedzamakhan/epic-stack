import { prisma } from './index'

// Default onboarding steps to seed the database
export const DEFAULT_ONBOARDING_STEPS = [
	{
		key: 'create_first_note',
		title: 'Create your first note',
		description: 'Start documenting your ideas and thoughts',
		icon: 'file-text',
		actionConfig: {
			type: 'navigate' as const,
			target: '/notes/new',
			label: 'Create Note',
		},
		autoDetect: true,
		detectConfig: {
			condition: 'hasNotes',
		},
		sortOrder: 2,
	},
	{
		key: 'invite_members',
		title: 'Invite team members',
		description: 'Collaborate with your team by inviting members',
		icon: 'user-plus',
		actionConfig: {
			type: 'navigate' as const,
			target: '/settings/members',
			label: 'Invite Members',
		},
		autoDetect: true,
		detectConfig: {
			condition: 'hasMembersInvited',
		},
		sortOrder: 3,
	},
	{
		key: 'complete_profile',
		title: 'Set up your organization profile',
		description: 'Update your organization name and settings',
		icon: 'user',
		actionConfig: {
			type: 'navigate' as const,
			target: '/settings',
			label: 'Complete Profile',
		},
		autoDetect: true,
		detectConfig: {
			condition: 'hasCompletedProfile',
		},
		sortOrder: 1,
	},
	{
		key: 'try_ai_chat',
		title: 'Try the AI chat feature',
		description:
			'Experience AI-powered assistance for your notes (auto-completes when you use AI)',
		icon: 'sparkles',
		actionConfig: {
			type: 'navigate' as const,
			target: '/notes',
			label: 'Go to Notes',
		},
		autoDetect: true,
		detectConfig: {
			condition: 'hasUsedAiChat',
		},
		sortOrder: 4,
	},
	{
		key: 'explore_command_menu',
		title: 'Explore the command menu',
		description: 'Use Cmd/Ctrl + K to quickly navigate and perform actions',
		icon: 'command',
		actionConfig: {
			type: 'modal' as const,
			target: 'command-menu',
			label: 'Open Command Menu',
		},
		autoDetect: false, // This will be manually tracked when command menu opens
		detectConfig: {
			condition: 'hasUsedCommandMenu',
		},
		sortOrder: 5,
	},
	{
		key: 'connect_integration',
		title: 'Connect integrations',
		description: 'Enhance your workflow with third-party integrations',
		icon: 'blocks',
		actionConfig: {
			type: 'navigate' as const,
			target: '/settings/integrations',
			label: 'View Integrations',
		},
		autoDetect: true,
		detectConfig: {
			condition: 'hasIntegrations',
		},
		sortOrder: 6,
	},
]

// Initialize onboarding steps in database
export async function initializeOnboardingSteps() {
	for (const step of DEFAULT_ONBOARDING_STEPS) {
		await prisma.onboardingStep.upsert({
			where: { key: step.key },
			update: {
				title: step.title,
				description: step.description,
				actionConfig: JSON.stringify(step.actionConfig),
				icon: step.icon,
				autoDetect: step.autoDetect,
				detectConfig: step.detectConfig
					? JSON.stringify(step.detectConfig)
					: null,
				sortOrder: step.sortOrder,
			},
			create: {
				key: step.key,
				title: step.title,
				description: step.description,
				actionConfig: JSON.stringify(step.actionConfig),
				icon: step.icon,
				autoDetect: step.autoDetect,
				detectConfig: step.detectConfig
					? JSON.stringify(step.detectConfig)
					: null,
				sortOrder: step.sortOrder,
			},
		})
	}
}
