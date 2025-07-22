import { invariant } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { integrationManager } from '#app/utils/integrations/integration-manager'
import { type OAuthState } from '#app/utils/integrations/types.ts'
import { redirectWithToast } from '#app/utils/toast.server'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request)
  
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const errorDescription = url.searchParams.get('error_description')
  const providerName = url.searchParams.get('provider')

  // Handle OAuth errors
  if (error) {
    const errorMsg = errorDescription || error
    console.error('OAuth error:', errorMsg)
    
    return redirectWithToast('/', {
      title: 'Integration failed',
      description: `Failed to connect: ${errorMsg}`,
      type: 'error',
    })
  }

  // Validate required parameters
  if (!code || !state || !providerName) {
    return redirectWithToast('/', {
      title: 'Integration failed',
      description: 'Missing required OAuth parameters',
      type: 'error',
    })
  }

  try {
    // Parse state to get organization ID
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString()) as OAuthState
    } catch (error) {
      throw new Error(`Invalid OAuth state: ${error}`)
    }

    // Handle OAuth callback
    const integration = await integrationManager.handleOAuthCallback(providerName, {
      organizationId: stateData.organizationId,
      code,
      state,
      error: error || undefined,
      errorDescription: errorDescription || undefined,
    })

    // Get organization slug for redirect
    const { prisma } = await import('#app/utils/db.server')
    const organization = await prisma.organization.findUnique({
      where: { id: integration.organizationId },
      select: { slug: true }
    })

    invariant(organization, 'Organization not found')

    return redirectWithToast(`/app/${organization.slug}/settings`, {
      title: 'Integration connected',
      description: `Successfully connected to ${providerName}`,
      type: 'success',
    })
  } catch (error) {
    console.error('OAuth callback error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return redirectWithToast('/', {
      title: 'Integration failed',
      description: `Failed to complete connection: ${errorMessage}`,
      type: 'error',
    })
  }
}