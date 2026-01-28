import { type Toast } from '@repo/common/toast'
import { useEffect } from 'react'
import { toast as showToast } from 'sonner'

export function useToast(toast?: Toast | null) {
	useEffect(() => {
		if (!toast) return

		const timeoutId = setTimeout(() => {
			showToast[toast.type](toast.title, {
				id: toast.id,
				description: toast.description,
			})
		}, 0)

		return () => clearTimeout(timeoutId)
	}, [toast])
}
