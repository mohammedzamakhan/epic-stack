/**
 * Slack integration provider implementation
 */
import { type Integration, type NoteIntegrationConnection } from '@prisma/client';
import { BaseIntegrationProvider } from '../provider';
import { type TokenData, type Channel, type MessageData, type OAuthCallbackParams } from '../types';
/**
 * Slack integration provider
 */
export declare class SlackProvider extends BaseIntegrationProvider {
    readonly name = "slack";
    readonly type: "productivity";
    readonly displayName = "Slack";
    readonly description = "Connect notes to Slack channels for team collaboration";
    readonly logoPath = "/icons/slack.svg";
    private get clientId();
    private get clientSecret();
    /**
     * Generate Slack OAuth authorization URL
     */
    getAuthUrl(organizationId: string, redirectUri: string, additionalParams?: Record<string, any>): Promise<string>;
    /**
     * Handle OAuth callback and exchange code for tokens
     */
    handleCallback(params: OAuthCallbackParams): Promise<TokenData>;
    /**
     * Refresh Slack access token
     * Note: Slack doesn't use refresh tokens in the same way as other providers
     */
    refreshToken(refreshToken: string): Promise<TokenData>;
    /**
     * Get available Slack channels
     */
    getAvailableChannels(integration: Integration): Promise<Channel[]>;
    /**
     * Post a message to a Slack channel
     */
    postMessage(connection: NoteIntegrationConnection & {
        integration: Integration;
    }, message: MessageData): Promise<void>;
    /**
     * Validate a Slack connection
     */
    validateConnection(_connection: NoteIntegrationConnection & {
        integration: Integration;
    }): Promise<boolean>;
    /**
     * Get Slack provider configuration schema
     */
    getConfigSchema(): Record<string, any>;
    /**
     * Format message for Slack blocks
     */
    private formatSlackBlocks;
    /**
     * Format message as plain text for Slack
     */
    private formatSlackText;
    /**
     * Get emoji for change type
     */
    private getChangeTypeEmoji;
    /**
     * Check if URL is valid for Slack buttons (must be absolute)
     */
    private isValidUrl;
    /**
     * Truncate content for Slack message
     */
    private truncateContent;
}
//# sourceMappingURL=slack-provider.d.ts.map