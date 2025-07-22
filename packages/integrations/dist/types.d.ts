/**
 * Core integration types and interfaces for third-party service integrations
 */
export interface TokenData {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    scope?: string;
    metadata?: Record<string, any>;
}
export interface Channel {
    id: string;
    name: string;
    type: 'public' | 'private' | 'dm';
    metadata?: Record<string, any>;
}
export interface MessageData {
    title: string;
    content: string;
    author: string;
    noteUrl: string;
    changeType: 'created' | 'updated' | 'deleted';
}
export interface SlackConfig {
    teamId: string;
    teamName: string;
    botUserId: string;
    scope: string;
}
export interface TeamsConfig {
    tenantId: string;
    teamId?: string;
    scope: string;
}
export interface SlackConnectionConfig {
    channelName: string;
    channelType: 'public' | 'private';
    postFormat: 'blocks' | 'text';
    includeContent: boolean;
}
export type ProviderConfig = SlackConfig | TeamsConfig | Record<string, any>;
export type ConnectionConfig = SlackConnectionConfig | Record<string, any>;
export interface OAuthCallbackParams {
    organizationId: string;
    code: string;
    state: string;
    error?: string;
    errorDescription?: string;
}
export interface OAuthState {
    organizationId: string;
    providerName: string;
    redirectUrl?: string;
    timestamp: number;
    nonce?: string;
    [key: string]: any;
}
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'expired';
export type ProviderType = 'productivity' | 'ticketing' | 'communication';
export interface IntegrationLogEntry {
    action: string;
    status: 'success' | 'error' | 'pending';
    requestData?: Record<string, any>;
    responseData?: Record<string, any>;
    errorMessage?: string;
    timestamp: Date;
}
export interface IntegrationProvider {
    name: string;
    type: ProviderType;
    getAuthUrl(organizationId: string, redirectUri: string): Promise<string>;
    handleCallback(code: string, state: string): Promise<TokenData>;
    refreshToken?(refreshToken: string): Promise<TokenData>;
    revokeToken?(accessToken: string): Promise<void>;
    getAvailableChannels(accessToken: string): Promise<Channel[]>;
    postMessage(accessToken: string, channelId: string, message: MessageData): Promise<void>;
    validateConnection(accessToken: string, channelId: string): Promise<boolean>;
}
//# sourceMappingURL=types.d.ts.map