'use client'

import * as React from 'react'

import { cn } from '../../lib/utils'
import { Icon } from '../icon'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ButtonGroup, ButtonGroupText } from '../ui/button-group'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
	getFilterArity,
	getFilterOperator,
	operatorTakesValue,
	resolveFilterOperators,
} from './filters-operators'
import {
	type FilterField,
	type FilterOperator,
	type FilterOption,
	type FilterRule,
	type FilterValueDisplayContext,
} from './filters-types'

function defaultValueLabel(
	value: unknown,
	operator: FilterOperator | undefined,
	resolveOption: (value: string) => FilterOption | undefined,
	placeholder: string,
): string {
	if (!operatorTakesValue(operator)) return ''
	if (value === undefined || value === null || value === '') return placeholder

	if (getFilterArity(operator) === 'many' && Array.isArray(value)) {
		if (value.length === 0) return placeholder
		return value
			.map((entry) => resolveOption(String(entry))?.label ?? String(entry))
			.join(', ')
	}

	const resolved = resolveOption(String(value))
	return resolved?.label ?? String(value)
}

function FilterValueDisplay<V, O>({
	rule,
	field,
	operator,
}: {
	rule: FilterRule<V>
	field: FilterField<V, O>
	operator: FilterOperator | undefined
}) {
	const resolveOption = React.useCallback(
		(value: string) => field.options?.find((option) => option.value === value),
		[field.options],
	)

	const values =
		rule.value === undefined || rule.value === null
			? []
			: Array.isArray(rule.value)
				? rule.value
				: [rule.value]

	const options = values
		.map((entry) => resolveOption(String(entry)))
		.filter(Boolean) as FilterOption<O>[]

	const context: FilterValueDisplayContext<V, O> = {
		value: rule.value,
		values,
		field,
		operator: operator ?? { value: rule.operator, label: rule.operator },
		options,
	}

	if (field.renderValue) {
		return <>{field.renderValue(context)}</>
	}

	const fallback = defaultValueLabel(
		rule.value,
		operator,
		resolveOption,
		field.placeholder ?? 'Select value',
	)

	return <span className="truncate">{fallback}</span>
}

export interface FilterChipProps<V, O> {
	rule: FilterRule<V>
	field: FilterField<V, O>
	onUpdate: (updates: Partial<Omit<FilterRule<V>, 'id' | 'type'>>) => void
	onRemove: () => void
	disabled?: boolean
}

export function FilterChip<V, O>({
	rule,
	field,
	onUpdate,
	onRemove,
	disabled,
}: FilterChipProps<V, O>) {
	const [operatorOpen, setOperatorOpen] = React.useState(false)
	const [valueOpen, setValueOpen] = React.useState(false)
	const [menuOpen, setMenuOpen] = React.useState(false)
	const [textDraft, setTextDraft] = React.useState('')

	const operators = resolveFilterOperators(field)
	const operator = getFilterOperator(operators, rule.operator)
	const incomplete = !rule.operator
	const hasValue = Boolean(rule.operator) && operatorTakesValue(operator)
	const operatorLabel = operator?.label ?? 'Select condition'

	React.useEffect(() => {
		if (valueOpen) {
			setTextDraft(
				rule.value === undefined || rule.value === null
					? ''
					: String(rule.value),
			)
		}
	}, [valueOpen, rule.value])

	const commitTextValue = () => {
		onUpdate({ value: textDraft as V })
		setValueOpen(false)
	}

	const toggleMultiValue = (optionValue: string) => {
		const current: unknown[] = Array.isArray(rule.value) ? [...rule.value] : []
		const index = current.findIndex((entry) => String(entry) === optionValue)
		if (index >= 0) current.splice(index, 1)
		else current.push(optionValue)
		onUpdate({ value: current as V })
	}

	return (
		<ButtonGroup data-slot="filter-chip">
			<ButtonGroupText className="bg-background dark:bg-input/30 cursor-default gap-1.5">
				{field.icon}
				{field.label}
			</ButtonGroupText>

			<DropdownMenu open={operatorOpen} onOpenChange={setOperatorOpen}>
				<DropdownMenuTrigger
					disabled={disabled}
					render={
						<ButtonGroupText
							render={<button type="button" />}
							className={cn(
								'hover:bg-accent bg-background dark:bg-input/30 cursor-default',
								incomplete ? 'text-foreground' : 'text-muted-foreground',
								disabled && 'pointer-events-none opacity-50',
							)}
						>
							{operatorLabel}
						</ButtonGroupText>
					}
				/>
				<DropdownMenuContent align="start" className="min-w-40">
					{operators.map((entry) => (
						<DropdownMenuItem
							key={entry.value}
							className={cn(rule.operator === entry.value && 'bg-accent')}
							onClick={() => {
								const nextValue =
									getFilterArity(entry) === 'many'
										? ([] as unknown as V)
										: getFilterArity(entry) === 'none'
											? undefined
											: rule.value
								onUpdate({ operator: entry.value, value: nextValue })
								setOperatorOpen(false)
								if (operatorTakesValue(entry)) {
									window.setTimeout(() => setValueOpen(true), 0)
								}
							}}
						>
							{entry.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{hasValue ? (
				field.type === 'text' || !field.options?.length ? (
					<Popover open={valueOpen} onOpenChange={setValueOpen}>
						<PopoverTrigger
							render={
								<ButtonGroupText
									render={<button type="button" disabled={disabled} />}
									className={cn(
										'hover:bg-accent bg-background dark:bg-input/30 max-w-48 cursor-default',
										(rule.value === undefined ||
											rule.value === null ||
											(Array.isArray(rule.value) && rule.value.length === 0)) &&
											'text-muted-foreground',
										disabled && 'pointer-events-none opacity-50',
									)}
								>
									<FilterValueDisplay
										rule={rule}
										field={field}
										operator={operator}
									/>
								</ButtonGroupText>
							}
						/>
						<PopoverContent align="start" className="w-64 gap-0 p-2">
							<div className="space-y-2">
								<Input
									value={textDraft}
									onChange={(event) => setTextDraft(event.target.value)}
									placeholder={field.placeholder ?? 'Enter value'}
									autoFocus
									onKeyDown={(event) => {
										if (event.key === 'Enter') commitTextValue()
									}}
								/>
								<div className="flex justify-end">
									<Button type="button" size="sm" onClick={commitTextValue}>
										Apply
									</Button>
								</div>
							</div>
						</PopoverContent>
					</Popover>
				) : (
					<DropdownMenu open={valueOpen} onOpenChange={setValueOpen}>
						<DropdownMenuTrigger
							disabled={disabled}
							render={
								<ButtonGroupText
									render={<button type="button" />}
									className={cn(
										'hover:bg-accent bg-background dark:bg-input/30 max-w-48 cursor-default',
										(rule.value === undefined ||
											rule.value === null ||
											(Array.isArray(rule.value) && rule.value.length === 0)) &&
											'text-muted-foreground',
										disabled && 'pointer-events-none opacity-50',
									)}
								>
									<FilterValueDisplay
										rule={rule}
										field={field}
										operator={operator}
									/>
								</ButtonGroupText>
							}
						/>
						<DropdownMenuContent
							align="start"
							className="max-h-60 w-56 overflow-y-auto"
						>
							{getFilterArity(operator) === 'one'
								? field.options.map((option) => (
										<DropdownMenuItem
											key={option.value}
											className={cn(
												String(rule.value) === option.value && 'bg-accent',
											)}
											onClick={() => {
												onUpdate({ value: option.value as V })
												setValueOpen(false)
											}}
										>
											{option.icon}
											{option.label}
										</DropdownMenuItem>
									))
								: field.options.map((option) => {
										const selected = Array.isArray(rule.value)
											? rule.value.some(
													(entry) => String(entry) === option.value,
												)
											: String(rule.value) === option.value
										return (
											<DropdownMenuCheckboxItem
												key={option.value}
												checked={selected}
												onCheckedChange={() => toggleMultiValue(option.value)}
												onSelect={(event) => event.preventDefault()}
											>
												{option.icon}
												{option.label}
											</DropdownMenuCheckboxItem>
										)
									})}
						</DropdownMenuContent>
					</DropdownMenu>
				)
			) : null}

			<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
				<DropdownMenuTrigger
					disabled={disabled}
					render={
						<Button
							variant="outline"
							size="icon-sm"
							className="bg-background dark:bg-input/30"
							aria-label={`${field.label} filter actions`}
						/>
					}
				>
					<Icon name="ellipsis" className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem variant="destructive" onClick={onRemove}>
						<Icon name="trash-2" />
						Remove
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	)
}

export const BADGE_LIMIT = 2

export function BadgesOrStack({
	options,
	fallback,
	badgeClassName,
	dotClassName,
}: {
	options: FilterOption[]
	fallback: string
	badgeClassName?: (value: string) => string | undefined
	dotClassName?: (value: string) => string | undefined
}) {
	if (options.length === 0) return <>{fallback}</>
	if (options.length > BADGE_LIMIT) {
		return (
			<span className="flex items-center gap-1.5">
				<span className="flex items-center">
					{options.slice(0, 4).map((option, index) => (
						<span
							key={option.value}
							className={cn(
								'ring-background -ml-1 size-2.5 rounded-full ring-2 first:ml-0',
								dotClassName?.(option.value) ?? 'bg-muted-foreground',
							)}
							style={{ zIndex: 10 - index }}
						/>
					))}
				</span>
				<span className="text-muted-foreground text-xs tabular-nums">
					{options.length}
				</span>
			</span>
		)
	}

	return (
		<span className="flex items-center gap-2">
			{options.map((option) => (
				<Badge
					key={option.value}
					variant="outline"
					className={cn('px-2 py-0.5', badgeClassName?.(option.value))}
				>
					{option.label}
				</Badge>
			))}
		</span>
	)
}
