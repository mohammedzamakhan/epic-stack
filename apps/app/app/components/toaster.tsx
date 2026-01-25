import { type Toast } from '@repo/common/toast'
import { useEffect } from 'react'
import { toast as showToast } from 'sonner'

export function useToast(toast?: Toast | null) {
	useEffect(() => {
		if (toast) {
			setTimeout(() => {
				showToast[toast.type](toast.title, {
					id: toast.id,
					description: toast.description,
				})
			}, 0)
		}
	}, [toast])
}
