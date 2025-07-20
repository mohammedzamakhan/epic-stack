import { type LoaderFunctionArgs } from 'react-router'
import { redirectWithToast } from '#app/utils/toast.server'
import { requireUserId } from '#app/utils/auth.server'
import { integrationManager } from '#app/utils/integrations/integration-manager'
// Initialize providers
import '#app/utils/integrations/providers'

/**
 * Test OAuth callback route for demo purposes
 * Visit: /api/integrations/test-callback?provider=slack&orgSlug=your-org-slug
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireUserId(request)
  
  const url = new URL(request.url)
  const providerName = url.searchParams.get('provider') || 'slack'
  const orgSlug = url.searchParams.get('orgSlug')
  
  if (!orgSlug) {
    return redirectWithToast('/app/settings', {
      title: 'Test failed',
      description: 'Missing orgSlug parameter',
      type: 'error',
    })
  }

  try {
    // Get organization ID from slug
    const { prisma } = await import('#app/utils/db.server')
    const organization = await prisma.organization.findUnique({
      where: { slug: orgSlug },
      select: { id: true, slug: true }
    })

    if (!organization) {
      return redirectWithToast('/app/settings', {
        title: 'Test failed',
        description: 'Organization not found',
        type: 'error',
      })
    }

    // Create a mock OAuth callback
    const mockState = Buffer.from(JSON.stringify({
      organizationId: organization.id,
      providerName,
      timestamp: Date.now(),
      nonce: 'test-nonce'
    })).toString('base64')

    const integration = await integrationManager.handleOAuthCallback(providerName, {
      organizationId: organization.id,
      code: 'test-code',
      state: mockState,
    })

    return redirectWithToast(`/app/${organization.slug}/settings`, {
      title: 'Integration connected (Demo)',
      description: `Successfully connected to ${providerName} - Integration ID: ${integration.id}`,
      type: 'success',
    })
  } catch (error) {
    console.error('Test OAuth callback error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return redirectWithToast(`/app/${orgSlug}/settings`, {
      title: 'Integration test failed',
      description: `Failed to complete test connection: ${errorMessage}`,
      type: 'error',
    })
  }
}