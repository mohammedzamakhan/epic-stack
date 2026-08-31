'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { Icon } from '../icon'
import { Button } from '../ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { FilterChip } from './filters-chip'
import { getDefaultFilterOperator, getFilterArity } from './filters-operators'
import {
	clearFilterQuery,
	countFilterRules,
	createFilterIdFactory,
	createFilterQuery,
	createFilterRule,
	findFilterRule,
	flattenFilterRules,
	insertFilterRule,
	removeFilterRule,
	updateFilterRule,
} from './filters-query'
import {
	type FilterChangeDetails,
	type FilterField,
	type FilterQuery,
	type FilterRule,
	type FiltersProps,
} from './filters-types'

function useControllableQuery<V, O>({
	controlled,
	defaultQuery,
	onChange,
}: {
	controlled: FilterQuery<V> | undefined
	defaultQuery: FilterQuery<V> | undefined
	onChange: FiltersProps<V, O>['onQueryChange']
}) {
	const isControlled = controlled !== undefined
	const [internal, setInternal] = React.useState<FilterQuery<V>>(
		() => defaultQuery ?? createFilterQuery<V>(),
	)
	const query = isControlled ? controlled : internal
	const queryRef = React.useRef(query)
	React.useEffect(() => {
		queryRef.current = query
	})

	const setQuery = React.useCallback(
		(next: FilterQuery<V>, details: FilterChangeDetails<V, O>) => {
			if (next === queryRef.current) return
			queryRef.current = next
			if (!isControlled) setInternal(next)
			onChange?.(next, details)
		},
		[isControlled, onChange],
	)

	return { query, setQuery }
}

export function Filters<V = unknown, O = unknown>({
	fields,
	query: controlledQuery,
	defaultQuery,
	onQueryChange,
	showClear = false,
	disabled = false,
	className,
}: FiltersProps<V, O>) {
	const { query, setQuery } = useControllableQuery<V, O>({
		controlled: controlledQuery,
		defaultQuery,
		onChange: onQueryChange,
	})
	const idSeed = React.useId()
	const nextId = React.useMemo(
		() => createFilterIdFactory(`${idSeed}f`),
		[idSeed],
	)
	const [pickerOpen, setPickerOpen] = React.useState(false)

	const fieldMap = React.useMemo(
		() => new Map(fields.map((field) => [field.id, field])),
		[fields],
	)
	const rules = flattenFilterRules(query)
	const ruleCount = countFilterRules(query)
	const usedFieldIds = new Set(rules.map((rule) => rule.path[0]))
	const availableFields = fields.filter((field) => !usedFieldIds.has(field.id))

	const emit = React.useCallback(
		(
			next: FilterQuery<V>,
			reason: FilterChangeDetails<V, O>['reason'],
			rule: FilterRule<V> | null,
		) => {
			const field = rule ? (fieldMap.get(rule.path[0] ?? '') ?? null) : null
			setQuery(next, { reason, rule, field })
		},
		[fieldMap, setQuery],
	)

	const addField = (field: FilterField<V, O>) => {
		const operator = getDefaultFilterOperator(field)
		const rule = createFilterRule<V>({
			id: nextId(),
			path: [field.id],
			operator: operator?.value ?? '',
			value:
				getFilterArity(operator) === 'many' ? ([] as unknown as V) : undefined,
		})
		emit(insertFilterRule(query, rule), 'add', rule)
		setPickerOpen(false)
	}

	return (
		<div className={cn('flex flex-wrap items-center gap-2', className)}>
			{rules.map((rule) => {
				const field = fieldMap.get(rule.path[0] ?? '')
				if (!field) return null
				return (
					<FilterChip
						key={rule.id}
						rule={rule}
						field={field}
						disabled={disabled}
						onUpdate={(updates) => {
							const next = updateFilterRule(query, rule.id, updates)
							emit(next, 'update', findFilterRule(next, rule.id) ?? rule)
						}}
						onRemove={() => {
							emit(removeFilterRule(query, rule.id), 'remove', rule)
						}}
					/>
				)
			})}

			{availableFields.length > 0 ? (
				<DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
					<DropdownMenuTrigger
						disabled={disabled}
						render={
							<Button
								variant="outline"
								size={rules.length === 0 ? 'sm' : 'icon-sm'}
								aria-label="Add filter"
							/>
						}
					>
						<Icon name="list-filter-plus" className="size-4" />
						{rules.length === 0 ? 'Add Filter' : null}
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						{availableFields.map((field) => (
							<DropdownMenuItem key={field.id} onClick={() => addField(field)}>
								{field.icon}
								{field.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}

			{showClear && ruleCount > 0 ? (
				<Button
					variant="outline"
					size="sm"
					className="ms-auto"
					disabled={disabled}
					onClick={() => emit(clearFilterQuery(query), 'clear', null)}
				>
					Clear
				</Button>
			) : null}
		</div>
	)
}

export {
	clearFilterQuery,
	countFilterRules,
	createFilterQuery,
	createFilterRule,
	flattenFilterConditions,
	flattenFilterRules,
	isFilterQueryEmpty,
} from './filters-query'
export type {
	FilterChangeDetails,
	FilterField,
	FilterOption,
	FilterQuery,
	FilterRule,
	FiltersProps,
} from './filters-types'
export type { FilterCondition } from './filters-query'
export { BadgesOrStack, BADGE_LIMIT } from './filters-chip'
