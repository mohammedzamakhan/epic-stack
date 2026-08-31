import {
	type FilterCombinator,
	type FilterNode,
	type FilterQuery,
	type FilterRule,
} from './filters-types'

export function isFilterRule<V>(node: FilterNode<V>): node is FilterRule<V> {
	return node.type === 'rule'
}

export function createFilterRule<V>(input: {
	id: string
	path: string[]
	operator: string
	value?: V
	negated?: boolean
}): FilterRule<V> {
	const rule: FilterRule<V> = {
		id: input.id,
		type: 'rule',
		path: input.path,
		operator: input.operator,
		value: input.value,
	}
	if (input.negated) rule.negated = true
	return rule
}

export function createFilterQuery<V>(
	rules: FilterNode<V>[] = [],
	combinator: FilterCombinator = 'and',
	id = 'root',
): FilterQuery<V> {
	return { id, type: 'group', combinator, rules }
}

export function flattenFilterRules<V>(query: FilterQuery<V>): FilterRule<V>[] {
	const out: FilterRule<V>[] = []
	const walk = (node: FilterNode<V>) => {
		if (isFilterRule(node)) {
			out.push(node)
			return
		}
		for (const child of node.rules) walk(child)
	}
	walk(query)
	return out
}

export interface FilterCondition {
	path: string[]
	field: string
	operator: string
	values: unknown[]
	negated: boolean
}

export function isFilterRuleComplete(rule: FilterRule): boolean {
	return rule.operator !== ''
}

export function flattenFilterConditions<V>(
	query: FilterQuery<V>,
): FilterCondition[] {
	return flattenFilterRules(query)
		.filter(isFilterRuleComplete)
		.map((rule) => ({
			path: rule.path,
			field: rule.path[0] ?? '',
			operator: rule.operator,
			values:
				rule.value === undefined || rule.value === null
					? []
					: Array.isArray(rule.value)
						? rule.value
						: [rule.value],
			negated: Boolean(rule.negated),
		}))
}

export function countFilterRules<V>(query: FilterQuery<V>): number {
	return flattenFilterRules(query).length
}

export function isFilterQueryEmpty<V>(query: FilterQuery<V>): boolean {
	return query.rules.length === 0
}

export function clearFilterQuery<V>(query: FilterQuery<V>): FilterQuery<V> {
	if (query.rules.length === 0) return query
	return { ...query, rules: [] }
}

export function updateFilterRule<V>(
	query: FilterQuery<V>,
	ruleId: string,
	updates: Partial<Omit<FilterRule<V>, 'id' | 'type'>>,
): FilterQuery<V> {
	let changed = false

	const walk = (node: FilterNode<V>): FilterNode<V> => {
		if (isFilterRule(node)) {
			if (node.id !== ruleId) return node
			changed = true
			return { ...node, ...updates }
		}
		const rules = node.rules.map(walk)
		return rules === node.rules ? node : { ...node, rules }
	}

	const next = walk(query)
	return changed ? (next as FilterQuery<V>) : query
}

export function removeFilterRule<V>(
	query: FilterQuery<V>,
	ruleId: string,
): FilterQuery<V> {
	if (!findFilterRule(query, ruleId)) return query
	return {
		...query,
		rules: query.rules.filter((rule) => rule.id !== ruleId),
	}
}

export function insertFilterRule<V>(
	query: FilterQuery<V>,
	rule: FilterRule<V>,
): FilterQuery<V> {
	return { ...query, rules: [...query.rules, rule] }
}

export function findFilterRule<V>(
	query: FilterQuery<V>,
	ruleId: string,
): FilterRule<V> | undefined {
	return flattenFilterRules(query).find((rule) => rule.id === ruleId)
}

export function createFilterIdFactory(prefix: string) {
	let counter = 0
	return () => `${prefix}-${counter++}`
}
