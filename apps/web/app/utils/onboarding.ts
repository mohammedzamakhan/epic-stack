import { prisma } from './db.server'

export interface OnboardingStepAction {
	type: 'navigate' | 'modal' | 'external'
	target: string
	label: string
}

export interface OnboardingStepDetectConfig {
	condition: string
	params?: Record<string, any>
}

export interface OnboardingStepWithProgress {
	id: string
	key: string
	title: string
	description: string
	icon?: string
	actionConfig?: OnboardingStepAction
	detectConfig?: OnboardingStepDetectConfig
	sortOrder: number
	isCompleted: boolean
	completedAt?: Date
}

export interface OnboardingProgressData {
	totalSteps: number
	completedCount: number
	isCompleted: boolean
	isVisible: boolean
	steps: OnboardingStepWithProgress[]
}

// Default onboarding steps to seed the database
export const DEFAULT_ONBOARDING_STEPS = [
	{
		key: 'create_first_note',
		title: 'Create your first note',
		description: 'Start documenting your ideas and thoughts',
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
				autoDetect: step.autoDetect,
				detectConfig: step.detectConfig
					? JSON.stringify(step.detectConfig)
					: null,
				sortOrder: step.sortOrder,
			},
		})
	}
}

// Get onboarding progress for a user in an organization
export async function getOnboardingProgress(
	userId: string,
	organizationId: string,
): Promise<OnboardingProgressData> {
	// Get all active onboarding steps
	const steps = await prisma.onboardingStep.findMany({
		where: { isActive: true },
		orderBy: { sortOrder: 'asc' },
		include: {
			userProgress: {
				where: {
					userId,
					organizationId,
				},
			},
		},
	})

	// Get or create overall progress record
	let progress = await prisma.onboardingProgress.findUnique({
		where: {
			userId_organizationId: {
				userId,
				organizationId,
			},
		},
	})

	if (!progress) {
		progress = await prisma.onboardingProgress.create({
			data: {
				userId,
				organizationId,
				totalSteps: steps.length,
				completedCount: 0,
				isCompleted: false,
			},
		})
	}

	// Transform steps with progress data
	const stepsWithProgress: OnboardingStepWithProgress[] = steps.map((step) => {
		const userProgress = step.userProgress[0]
		return {
			id: step.id,
			key: step.key,
			title: step.title,
			description: step.description,
			icon: step.icon || undefined,
			actionConfig: step.actionConfig
				? (JSON.parse(step.actionConfig) as OnboardingStepAction)
				: undefined,
			detectConfig: step.detectConfig
				? (JSON.parse(step.detectConfig) as OnboardingStepDetectConfig)
				: undefined,
			sortOrder: step.sortOrder,
			isCompleted: userProgress?.isCompleted || false,
			completedAt: userProgress?.completedAt || undefined,
		}
	})

	const completedCount = stepsWithProgress.filter(
		(step) => step.isCompleted,
	).length

	return {
		totalSteps: steps.length,
		completedCount,
		isCompleted: completedCount === steps.length,
		isVisible: progress.isVisible,
		steps: stepsWithProgress,
	}
}

// Mark a step as completed
export async function markStepCompleted(
	userId: string,
	organizationId: string,
	stepKey: string,
	metadata?: Record<string, any>,
) {
	const step = await prisma.onboardingStep.findUnique({
		where: { key: stepKey },
	})

	if (!step) {
		throw new Error(`Onboarding step '${stepKey}' not found`)
	}

	// Create or update step progress
	await prisma.onboardingStepProgress.upsert({
		where: {
			userId_organizationId_stepId: {
				userId,
				organizationId,
				stepId: step.id,
			},
		},
		update: {
			isCompleted: true,
			completedAt: new Date(),
			metadata: metadata ? JSON.stringify(metadata) : null,
		},
		create: {
			userId,
			organizationId,
			stepId: step.id,
			isCompleted: true,
			completedAt: new Date(),
			metadata: metadata ? JSON.stringify(metadata) : null,
		},
	})

	// Update overall progress
	const completedCount = await prisma.onboardingStepProgress.count({
		where: {
			userId,
			organizationId,
			isCompleted: true,
		},
	})

	const totalSteps = await prisma.onboardingStep.count({
		where: { isActive: true },
	})

	const isCompleted = completedCount === totalSteps

	await prisma.onboardingProgress.upsert({
		where: {
			userId_organizationId: {
				userId,
				organizationId,
			},
		},
		update: {
			completedCount,
			totalSteps,
			isCompleted,
			completedAt: isCompleted ? new Date() : null,
		},
		create: {
			userId,
			organizationId,
			completedCount,
			totalSteps,
			isCompleted,
			completedAt: isCompleted ? new Date() : null,
		},
	})
}

// Hide onboarding for a user
export async function hideOnboarding(userId: string, organizationId: string) {
	await prisma.onboardingProgress.upsert({
		where: {
			userId_organizationId: {
				userId,
				organizationId,
			},
		},
		update: {
			isVisible: false,
		},
		create: {
			userId,
			organizationId,
			isVisible: false,
			totalSteps: 0,
			completedCount: 0,
			isCompleted: false,
		},
	})
}

// Auto-detect completed steps based on user data
export async function autoDetectCompletedSteps(
	userId: string,
	organizationId: string,
) {
	// Get detection data
	const detectionData = await getDetectionData(userId, organizationId)

	// Get steps that have auto-detection enabled
	const stepsWithDetection = await prisma.onboardingStep.findMany({
		where: {
			isActive: true,
			autoDetect: true,
			detectConfig: { not: null },
		},
	})

	for (const step of stepsWithDetection) {
		if (!step.detectConfig) continue

		try {
			const detectConfig = JSON.parse(
				step.detectConfig,
			) as OnboardingStepDetectConfig
			const isCompleted = evaluateDetectionCondition(
				detectConfig.condition,
				detectionData,
			)

			if (isCompleted) {
				// Check if already marked as completed
				const existingProgress = await prisma.onboardingStepProgress.findUnique(
					{
						where: {
							userId_organizationId_stepId: {
								userId,
								organizationId,
								stepId: step.id,
							},
						},
					},
				)

				if (!existingProgress?.isCompleted) {
					await markStepCompleted(userId, organizationId, step.key, {
						autoDetected: true,
					})
				}
			}
		} catch (error) {
			console.error(`Error auto-detecting step ${step.key}:`, error)
		}
	}
}

// Get data needed for auto-detection
async function getDetectionData(userId: string, organizationId: string) {
	const [
		notesCount,
		membersCount,
		organization,
		integrationsCount,
		invitationsCount,
	] = await Promise.all([
		prisma.organizationNote.count({
			where: {
				organizationId,
				createdById: userId,
			},
		}),
		prisma.userOrganization.count({
			where: {
				organizationId,
				active: true,
			},
		}),
		prisma.organization.findUnique({
			where: { id: organizationId },
			select: { name: true, slug: true, createdAt: true },
		}),
		prisma.integration.count({
			where: {
				organizationId,
				isActive: true,
			},
		}),
		prisma.organizationInvitation.count({
			where: {
				organizationId,
				inviterId: userId,
			},
		}),
	])

	// Check if user has used AI chat by looking at onboarding step completion
	const aiChatStep = await prisma.onboardingStepProgress.findFirst({
		where: {
			userId,
			organizationId,
			step: {
				key: 'try_ai_chat',
			},
			isCompleted: true,
		},
	})

	// Check if user has used command menu by looking at onboarding step completion
	const commandMenuStep = await prisma.onboardingStepProgress.findFirst({
		where: {
			userId,
			organizationId,
			step: {
				key: 'explore_command_menu',
			},
			isCompleted: true,
		},
	})

	return {
		hasNotes: notesCount > 0,
		hasMembersInvited: membersCount > 1 || invitationsCount > 0, // Has other members OR has sent invitations
		hasCompletedProfile: !!(
			organization?.name &&
			organization?.name.trim() !== '' &&
			organization?.slug &&
			organization?.slug.trim() !== ''
		),
		hasUsedAiChat: !!aiChatStep,
		hasUsedCommandMenu: !!commandMenuStep,
		hasIntegrations: integrationsCount > 0,
	}
}

// Evaluate detection conditions
function evaluateDetectionCondition(
	condition: string,
	data: Record<string, any>,
): boolean {
	switch (condition) {
		case 'hasNotes':
			return data.hasNotes
		case 'hasMembersInvited':
			return data.hasMembersInvited
		case 'hasCompletedProfile':
			return data.hasCompletedProfile
		case 'hasUsedAiChat':
			return data.hasUsedAiChat
		case 'hasUsedCommandMenu':
			return data.hasUsedCommandMenu
		case 'hasIntegrations':
			return data.hasIntegrations
		default:
			return false
	}
}
