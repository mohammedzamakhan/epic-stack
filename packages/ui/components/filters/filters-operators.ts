import {
	type FilterField,
	type FilterOperator,
	type FilterOperatorArity,
	type FilterValueType,
} from './filters-types'

export const DEFAULT_FILTER_OPERATOR_LABELS: Record<string, string> = {
	contains: 'contains',
	not_contains: 'does not contain',
	starts_with: 'starts with',
	ends_with: 'ends with',
	is: 'is',
	is_not: 'is not',
	is_any_of: 'is any of',
	is_none_of: 'is none of',
	has_any_of: 'has any of',
	has_all_of: 'has all of',
	has_none_of: 'has none of',
	empty: 'is empty',
	not_empty: 'is not empty',
}

const CATALOG: Record<
	FilterValueType,
	{ value: string; arity?: FilterOperatorArity; inverse?: string }[]
> = {
	text: [
		{ value: 'contains', inverse: 'not_contains' },
		{ value: 'not_contains', inverse: 'contains' },
		{ value: 'starts_with' },
		{ value: 'ends_with' },
		{ value: 'is', inverse: 'is_not' },
		{ value: 'is_not', inverse: 'is' },
		{ value: 'empty', arity: 'none', inverse: 'not_empty' },
		{ value: 'not_empty', arity: 'none', inverse: 'empty' },
	],
	number: [
		{ value: 'is', inverse: 'is_not' },
		{ value: 'is_not', inverse: 'is' },
		{ value: 'empty', arity: 'none', inverse: 'not_empty' },
		{ value: 'not_empty', arity: 'none', inverse: 'empty' },
	],
	select: [
		{ value: 'is', inverse: 'is_not' },
		{ value: 'is_not', inverse: 'is' },
		{ value: 'is_any_of', arity: 'many', inverse: 'is_none_of' },
		{ value: 'is_none_of', arity: 'many', inverse: 'is_any_of' },
		{ value: 'empty', arity: 'none', inverse: 'not_empty' },
		{ value: 'not_empty', arity: 'none', inverse: 'empty' },
	],
	multiselect: [
		{ value: 'has_any_of', arity: 'many', inverse: 'has_none_of' },
		{ value: 'has_all_of', arity: 'many' },
		{ value: 'has_none_of', arity: 'many', inverse: 'has_any_of' },
		{ value: 'empty', arity: 'none', inverse: 'not_empty' },
		{ value: 'not_empty', arity: 'none', inverse: 'empty' },
	],
	boolean: [
		{ value: 'is', inverse: 'is_not' },
		{ value: 'is_not', inverse: 'is' },
	],
}

export function createFilterOperators(
	labels: Record<string, string> = DEFAULT_FILTER_OPERATOR_LABELS,
): Record<FilterValueType, FilterOperator[]> {
	return Object.fromEntries(
		Object.entries(CATALOG).map(([type, entries]) => [
			type,
			entries.map((entry) => ({
				value: entry.value,
				label: labels[entry.value] ?? entry.value,
				arity: entry.arity,
				inverse: entry.inverse,
			})),
		]),
	) as Record<FilterValueType, FilterOperator[]>
}

export const DEFAULT_FILTER_OPERATORS = createFilterOperators()

export function resolveFilterOperators<V, O>(
	field: FilterField<V, O>,
	catalog: Record<FilterValueType, FilterOperator[]> = DEFAULT_FILTER_OPERATORS,
): FilterOperator[] {
	if (field.operators) return field.operators
	const type = field.type ?? 'text'
	return catalog[type] ?? catalog.text
}

export function getFilterOperator(
	operators: FilterOperator[],
	value: string,
): FilterOperator | undefined {
	return operators.find((operator) => operator.value === value)
}

export function getDefaultFilterOperator<V, O>(
	field: FilterField<V, O>,
): FilterOperator | undefined {
	const operators = resolveFilterOperators(field)
	if (field.defaultOperator) {
		return getFilterOperator(operators, field.defaultOperator)
	}
	return operators[0]
}

export function getFilterArity(
	operator: FilterOperator | undefined,
): FilterOperatorArity {
	return operator?.arity ?? 'one'
}

export function operatorTakesValue(
	operator: FilterOperator | undefined,
): boolean {
	return getFilterArity(operator) !== 'none'
}
