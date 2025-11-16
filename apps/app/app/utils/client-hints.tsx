// Core client hints utilities from UI package
export { getHints, ClientHintCheck } from '@repo/ui'

// App-specific hooks that depend on request-info
import { useOptionalRequestInfo, useRequestInfo } from './request-info.ts'

/**
 * @returns an object with the client hints and their values
 */
export function useHints() {
	const requestInfo = useRequestInfo()
	return requestInfo.hints
}

export function useOptionalHints() {
	const requestInfo = useOptionalRequestInfo()
	return requestInfo?.hints
}
