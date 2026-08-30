'use client'

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'

type AIPanelContextValue = {
	isOpen: boolean
	open: () => void
	close: () => void
	toggle: () => void
}

const AIPanelContext = createContext<AIPanelContextValue | null>(null)

const STORAGE_KEY = 'ai-panel-open'

export function AIPanelProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false)

	// Restore from localStorage on first mount.
	useEffect(() => {
		try {
			const stored = window.localStorage.getItem(STORAGE_KEY)
			if (stored === 'true') setIsOpen(true)
		} catch {
			// localStorage may be unavailable in some contexts; ignore.
		}
	}, [])

	const open = useCallback(() => setIsOpen(true), [])
	const close = useCallback(() => setIsOpen(false), [])
	const toggle = useCallback(() => setIsOpen((v) => !v), [])

	useEffect(() => {
		try {
			window.localStorage.setItem(STORAGE_KEY, String(isOpen))
		} catch {
			// ignore
		}
	}, [isOpen])

	const value = useMemo<AIPanelContextValue>(
		() => ({ isOpen, open, close, toggle }),
		[isOpen, open, close, toggle],
	)

	return (
		<AIPanelContext.Provider value={value}>{children}</AIPanelContext.Provider>
	)
}

export function useAIPanel() {
	const ctx = useContext(AIPanelContext)
	if (!ctx) {
		throw new Error('useAIPanel must be used within AIPanelProvider')
	}
	return ctx
}
