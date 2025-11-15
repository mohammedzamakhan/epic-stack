import { prisma } from './db.server'

export interface OnboardingStepAction {
	type: 'navigate' | 'modal' | 'external'
	target: string
	label: string
	completedLabel?: string
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

	// If no onboarding steps exist (e.g., database not seeded), return empty progress
	if (steps.length === 0) {
		return {
			totalSteps: 0,
			completedCount: 0,
			isCompleted: true, // Mark as completed so onboarding doesn't show
			isVisible: false,
			steps: [],
		}
	}

	// Get or create overall progress record
	let progress
	try {
		progress = await prisma.onboardingProgress.upsert({
			where: {
				userId_organizationId: {
					userId,
					organizationId,
				},
			},
			update: {
				totalSteps: steps.length,
			},
			create: {
				userId,
				organizationId,
				totalSteps: steps.length,
				completedCount: 0,
				isCompleted: false,
			},
		})
	} catch (error) {
		console.error('Error upserting onboarding progress:', error)
		// Return safe default if foreign key constraint fails - show onboarding if steps exist
		return {
			totalSteps: steps.length,
			completedCount: 0,
			isCompleted: false, // Don't mark as completed so onboarding shows
			isVisible: true, // Make it visible so onboarding shows
			steps: steps.map((step) => ({
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
				isCompleted: false,
				completedAt: undefined,
			})),
		}
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
	try {
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
	} catch (error) {
		// Log the error but don't throw it to prevent breaking the main flow
		console.error('Error marking onboarding step as completed:', error)
		// If it's a unique constraint error, it means the record already exists, which is fine
		if (error instanceof Error && error.message.includes('Unique constraint')) {
			console.log(
				`Onboarding step ${stepKey} already completed for user ${userId} in organization ${organizationId}`,
			)
			return
		}
		// For other errors, we still don't want to break the main flow
		console.error(
			`Failed to mark onboarding step ${stepKey} as completed:`,
			error,
		)
	}
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
	try {
		// Get steps that have auto-detection enabled
		const stepsWithDetection = await prisma.onboardingStep.findMany({
			where: {
				isActive: true,
				autoDetect: true,
				detectConfig: { not: null },
			},
		})

		// If no onboarding steps exist, skip auto-detection
		if (stepsWithDetection.length === 0) {
			return
		}

		// Get detection data
		const detectionData = await getDetectionData(userId, organizationId)

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
					const existingProgress =
						await prisma.onboardingStepProgress.findUnique({
							where: {
								userId_organizationId_stepId: {
									userId,
									organizationId,
									stepId: step.id,
								},
							},
						})

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
	} catch (error) {
		console.error('Error in autoDetectCompletedSteps:', error)
		// Fail silently to avoid breaking the app
		return
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
