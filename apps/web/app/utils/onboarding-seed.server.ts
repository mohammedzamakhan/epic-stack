import { initializeOnboardingSteps } from './onboarding'

// This function should be called when the app starts or during deployment
export async function seedOnboardingSteps() {
	try {
		await initializeOnboardingSteps()
		console.log('✅ Onboarding steps initialized successfully')
	} catch (error) {
		console.error('❌ Failed to initialize onboarding steps:', error)
		throw error
	}
}

// You can run this directly: npx tsx apps/web/app/utils/onboarding-seed.server.ts
if (import.meta.url === `file://${process.argv[1]}`) {
	seedOnboardingSteps()
		.then(() => process.exit(0))
		.catch(() => process.exit(1))
}
