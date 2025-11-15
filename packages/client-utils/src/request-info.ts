import { invariant } from '@epic-web/invariant'
import { useRouteLoaderData } from 'react-router'

// Type for root loader data
type RootLoaderData = {
	requestInfo: {
		hints: Record<string, string>
		origin: string
		path: string
		userPrefs: {
			theme?: string | null
		}
	}
}

/**
 * @returns the request info from the root loader (throws an error if it does not exist)
 */
export function useRequestInfo() {
	const maybeRequestInfo = useOptionalRequestInfo()
	invariant(maybeRequestInfo, 'No requestInfo found in root loader')

	return maybeRequestInfo
}

export function useOptionalRequestInfo() {
	const data = useRouteLoaderData<RootLoaderData>('root')

	return data?.requestInfo
}
