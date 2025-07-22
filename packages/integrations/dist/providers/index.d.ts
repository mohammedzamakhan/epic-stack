/**
 * Integration providers registry and initialization
 */
import { SlackProvider } from './slack-provider';
/**
 * Initialize and register all available integration providers
 */
export declare function initializeProviders(): void;
/**
 * Get all available providers for display in UI
 */
export declare function getAvailableProviders(): {
    name: string;
    type: string;
    displayName: string;
    description: string;
    icon: string;
}[];
export { SlackProvider };
export { providerRegistry } from '../provider';
//# sourceMappingURL=index.d.ts.map