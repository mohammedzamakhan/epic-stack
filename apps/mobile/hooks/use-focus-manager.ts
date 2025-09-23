import { useRef, useCallback } from 'react'
import { TextInput } from 'react-native'
import { dismissKeyboard } from '../lib/keyboard'

export interface UseFocusManagerReturn {
	refs: React.RefObject<(TextInput | null)[]>
	focusNext: (currentIndex: number) => void
	focusPrevious: (currentIndex: number) => void
	dismissKeyboard: () => void
	setRef: (index: number) => (ref: TextInput | null) => void
}

/**
 * Hook for managing focus between multiple input fields
 */
export const useFocusManager = (inputCount: number): UseFocusManagerReturn => {
	const refs = useRef<(TextInput | null)[]>(new Array(inputCount).fill(null))

	const setRef = useCallback(
		(index: number) => (ref: TextInput | null) => {
			refs.current[index] = ref
		},
		[],
	)

	const focusNext = useCallback((currentIndex: number) => {
		const nextIndex = currentIndex + 1
		if (nextIndex < refs.current.length && refs.current[nextIndex]) {
			refs.current[nextIndex]?.focus()
		} else {
			// If no next input, dismiss keyboard
			dismissKeyboard()
		}
	}, [])

	const focusPrevious = useCallback((currentIndex: number) => {
		const previousIndex = currentIndex - 1
		if (previousIndex >= 0 && refs.current[previousIndex]) {
			refs.current[previousIndex]?.focus()
		}
	}, [])

	const handleDismissKeyboard = useCallback(() => {
		dismissKeyboard()
	}, [])

	return {
		refs,
		focusNext,
		focusPrevious,
		dismissKeyboard: handleDismissKeyboard,
		setRef,
	}
}
