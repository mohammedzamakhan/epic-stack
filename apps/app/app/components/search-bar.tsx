import { useId } from 'react'
import { Form, useSearchParams, useSubmit } from 'react-router'
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { useDebounce, useIsPending } from '#app/utils/misc.tsx'
import { Input, FieldLabel, Icon, StatusButton } from '@repo/ui'

export function SearchBar({
	status,
	autoFocus = false,
	autoSubmit = false,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'
	autoFocus?: boolean
	autoSubmit?: boolean
}) {
	const { _ } = useLingui()
	const id = useId()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'GET',
		formAction: '/users',
	})

	const handleFormChange = useDebounce(async (form: HTMLFormElement) => {
		await submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action="/users"
			className="flex flex-wrap items-center justify-center gap-2"
			onChange={(e) => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<FieldLabel htmlFor={id} className="sr-only">
					<Trans>Search</Trans>
				</FieldLabel>
				<Input
					type="search"
					name="search"
					id={id}
					defaultValue={searchParams.get('search') ?? ''}
					placeholder={_(msg`Search`)}
					className="w-full"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
				>
					<Icon name="search" size="md" />
					<span className="sr-only">
						<Trans>Search</Trans>
					</span>
				</StatusButton>
			</div>
		</Form>
	)
}
