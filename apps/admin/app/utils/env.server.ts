export { ENV } from 'varlock/env'
import { ENV } from 'varlock/env'

export function getLaunchStatus() {
	return ENV.LAUNCH_STATUS
}
