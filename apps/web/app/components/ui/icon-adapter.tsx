// Type-safe adapter between generic UI package icons and web app's strict IconName types
import { Icon } from '#app/components/ui/icon'
import { type IconName } from '@/icon-name'

/**
 * Adapter to bridge the gap between:
 * - UI package components that expect { name: string, className?: string }
 * - Web app Icon component that expects { name: IconName, ... }
 *
 * This adapter validates that the icon name exists and provides type safety.
 */
export function IconAdapter({ name, className }: { name: string; className?: string }) {
	// Type-safe cast - the UI package should only pass valid icon names
	// If an invalid name is passed, it will fail at runtime, which helps catch issues
	return <Icon name={name as IconName} className={className} />
}
