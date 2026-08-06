import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { ToolbarContextValue } from './types'

export const ToolbarContext = createContext<ToolbarContextValue | null>(null)

export function useToolbarContext(): ToolbarContextValue {
	const context = useContext(ToolbarContext)
	if (!context) {
		throw new Error('Toolbar components must be used within a ToolbarRoot')
	}
	return context
}
