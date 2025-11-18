import React, { forwardRef } from 'react'
import {
	BaseAutocompleteList,
	type AutocompleteListRef,
} from './base-autocomplete-list.tsx'

interface MentionItem {
	id: string
	name: string
}

interface MentionListProps {
	items: MentionItem[]
	command: (item: { id: string; label: string }) => void
}

export const MentionList = forwardRef<AutocompleteListRef, MentionListProps>(
	(props, ref) => {
		return (
			<BaseAutocompleteList
				ref={ref}
				items={props.items}
				onSelectItem={(item) =>
					// Keep the name as label for display, but the id will be stored in data-id attribute
					props.command({ id: item.id, label: item.name })
				}
				renderItem={(item) => item.name}
				noResultsMessage="No results"
				className="min-w-[8rem]"
			/>
		)
	},
)

MentionList.displayName = 'MentionList'
