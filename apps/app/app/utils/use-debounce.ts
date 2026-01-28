import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook for debouncing a callback function
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 */
export function useDebounce<T extends (...args: any[]) => void>(
	callback: T,
	delay = 300,
): T {
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const callbackRef = useRef(callback)

	// Keep callback ref up to date
	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return useCallback(
		((...args) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			timeoutRef.current = setTimeout(() => {
				callbackRef.current(...args)
			}, delay)
		}) as T,
		[delay],
	)
}
