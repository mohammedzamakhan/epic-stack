import type * as React from 'react'

export type FilterCombinator = 'and' | 'or'

export interface FilterRule<V = unknown> {
	id: string
	type: 'rule'
	path: string[]
	operator: string
	value: V | undefined
	negated?: boolean
}

export interface FilterGroupNode<V = unknown> {
	id: string
	type: 'group'
	combinator: FilterCombinator
	rules: FilterNode<V>[]
}

export type FilterNode<V = unknown> = FilterRule<V> | FilterGroupNode<V>
export type FilterQuery<V = unknown> = FilterGroupNode<V>

export type FilterChangeReason = 'add' | 'update' | 'remove' | 'clear'

export interface FilterChangeDetails<V = unknown, O = unknown> {
	reason: FilterChangeReason
	rule: FilterRule<V> | null
	field: FilterField<V, O> | null
}

export type FilterOperatorArity = 'none' | 'one' | 'many' | 'range'

export interface FilterOperator {
	value: string
	label: string
	arity?: FilterOperatorArity
	inverse?: string
}

export type FilterValueType =
	'text' | 'number' | 'select' | 'multiselect' | 'boolean'

export interface FilterOption<O = unknown> {
	value: string
	label: string
	icon?: React.ReactNode
	description?: string
	keywords?: string[]
	disabled?: boolean
	data?: O
}

export interface FilterField<V = unknown, O = unknown> {
	id: string
	label: string
	icon?: React.ReactNode
	type?: FilterValueType
	options?: FilterOption<O>[]
	defaultOperator?: string
	operators?: FilterOperator[]
	searchable?: boolean
	placeholder?: string
	renderValue?: (context: FilterValueDisplayContext<V, O>) => React.ReactNode
}

export interface FilterValueDisplayContext<V = unknown, O = unknown> {
	value: V | undefined
	values: unknown[]
	field: FilterField<V, O>
	operator: FilterOperator
	options: FilterOption<O>[]
}

export interface FiltersProps<V = unknown, O = unknown> {
	fields: FilterField<V, O>[]
	query?: FilterQuery<V>
	defaultQuery?: FilterQuery<V>
	onQueryChange?: (
		query: FilterQuery<V>,
		details: FilterChangeDetails<V, O>,
	) => void
	showClear?: boolean
	disabled?: boolean
	className?: string
}
