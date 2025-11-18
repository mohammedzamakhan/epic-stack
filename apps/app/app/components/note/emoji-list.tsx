import React, { forwardRef } from 'react'
import {
	BaseAutocompleteList,
	type AutocompleteListRef,
} from './base-autocomplete-list.tsx'

interface EmojiItem {
	name: string
	emoji: string
	fallbackImage?: string
}

interface EmojiListProps {
	items: EmojiItem[]
	command: (item: { name: string }) => void
}

export const EmojiList = forwardRef<AutocompleteListRef, EmojiListProps>(
	(props, ref) => {
		return (
			<BaseAutocompleteList
				ref={ref}
				items={props.items}
				onSelectItem={(item) => props.command({ name: item.name })}
				renderItem={(item) => (
					<>
						<span className="text-base">{item.emoji}</span>
						<span className="truncate">:{item.name}:</span>
					</>
				)}
				noResultsMessage="No emojis found"
				className="max-w-[16rem] min-w-[12rem]"
			/>
		)
	},
)

EmojiList.displayName = 'EmojiList'
