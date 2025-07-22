/**
 * Core integration provider interface and base implementation
 */
/**
 * Base abstract class providing common functionality for integration providers
 */
export class BaseIntegrationProvider {
    // Common utility methods
    /**
     * Generate a secure random state string for OAuth
     * @param organizationId - Organization ID
     * @param additionalData - Additional data to include in state
     * @returns Secure state string
     */
    generateOAuthState(organizationId, additionalData) {
        // Import here to avoid circular dependencies
        const { OAuthStateManager } = require('./oauth-manager');
        return OAuthStateManager.generateState(organizationId, this.name, undefined, additionalData);
    }
    /**
     * Parse and validate OAuth state
     * @param state - State string to validate
     * @returns Parsed state data
     * @throws Error if state is invalid or expired
     */
    parseOAuthState(state) {
        // Import here to avoid circular dependencies
        const { OAuthStateManager } = require('./oauth-manager');
        return OAuthStateManager.validateState(state);
    }
    /**
     * Check if a token is expired or about to expire
     * @param expiresAt - Token expiration date
     * @param bufferMinutes - Minutes before expiration to consider expired
     * @returns True if token is expired or about to expire
     */
    isTokenExpired(expiresAt, bufferMinutes = 5) {
        if (!expiresAt)
            return false;
        const bufferMs = bufferMinutes * 60 * 1000;
        return Date.now() >= (expiresAt.getTime() - bufferMs);
    }
    /**
     * Make an authenticated HTTP request to the provider's API
     * @param integration - Integration with credentials
     * @param endpoint - API endpoint
     * @param _options - Fetch options
     * @returns Promise resolving to response
     */
    async makeAuthenticatedRequest(integration, endpoint, _options = {}) {
        // This will be implemented with token decryption in a later task
        throw new Error('makeAuthenticatedRequest not yet implemented - requires token encryption utilities');
    }
    /**
     * Handle API errors and convert to appropriate error types
     * @param response - HTTP response
     * @param context - Error context for logging
     */
    async handleApiError(response, context) {
        const errorText = await response.text();
        let errorMessage = `${context}: ${response.status} ${response.statusText}`;
        try {
            const errorData = JSON.parse(errorText);
            if (errorData?.error || errorData?.message) {
                errorMessage += ` - ${errorData.error || errorData.message}`;
            }
        }
        catch {
            // If response is not JSON, include raw text
            if (errorText) {
                errorMessage += ` - ${errorText}`;
            }
        }
        throw new Error(errorMessage);
    }
}
/**
 * Registry for managing integration providers
 */
export class ProviderRegistry {
    providers = new Map();
    /**
     * Register a new integration provider
     * @param provider - Provider instance to register
     */
    register(provider) {
        this.providers.set(provider.name, provider);
    }
    /**
     * Get a provider by name
     * @param name - Provider name
     * @returns Provider instance
     * @throws Error if provider not found
     */
    get(name) {
        const provider = this.providers.get(name);
        if (!provider) {
            throw new Error(`Integration provider '${name}' not found`);
        }
        return provider;
    }
    /**
     * Get all registered providers
     * @returns Array of all providers
     */
    getAll() {
        return Array.from(this.providers.values());
    }
    /**
     * Get providers by type
     * @param type - Provider type to filter by
     * @returns Array of providers matching the type
     */
    getByType(type) {
        return this.getAll().filter(provider => provider.type === type);
    }
    /**
     * Check if a provider is registered
     * @param name - Provider name
     * @returns True if provider is registered
     */
    has(name) {
        return this.providers.has(name);
    }
    /**
     * Unregister a provider
     * @param name - Provider name to unregister
     */
    unregister(name) {
        this.providers.delete(name);
    }
}
// Global provider registry instance
export const providerRegistry = new ProviderRegistry();
//# sourceMappingURL=provider.js.map