import { type ReportScope, getCatalog } from './catalog.ts'
import {
	type ReportDefinition,
	createReportDefinition,
	emptyFilterGroup,
} from './dsl.ts'

export type ReportTemplate = {
	id: string
	category: string
	title: string
	description: string
	scope: ReportScope
	definition: ReportDefinition
}

function template(
	scope: ReportScope,
	input: Omit<ReportTemplate, 'scope' | 'definition'> & {
		subject: string
		groupBy: string[]
		chartStyle: ReportDefinition['visualization']['chartStyle']
		timeframePreset?: ReportDefinition['timeframe']['preset']
		timeframeField?: string
		timeBucket?: ReportDefinition['timeBucket']
		columns?: string[]
		sortBy?: ReportDefinition['visualization']['sortBy']
		title?: string
	},
): ReportTemplate {
	const catalog = getCatalog(scope)
	const subject = catalog.subjects.find((item) => item.id === input.subject)
	if (!subject) {
		throw new Error(`Unknown template subject: ${input.subject}`)
	}
	const timeframeField =
		input.timeframeField ??
		subject.fields.find((field) => field.timeframe)?.id ??
		'createdAt'

	return {
		id: input.id,
		category: input.category,
		title: input.title,
		description: input.description,
		scope,
		definition: createReportDefinition({
			subject: input.subject,
			timeframe: {
				field: timeframeField,
				preset: input.timeframePreset ?? 'last_3_months',
			},
			groupBy: input.groupBy,
			timeBucket: input.timeBucket ?? 'month',
			columns: input.columns ?? [],
			filters: emptyFilterGroup(),
			visualization: {
				chartStyle: input.chartStyle,
				measure: 'count',
				sortBy: input.sortBy ?? 'value_desc',
				hideCounts: false,
			},
			settings: {
				title: input.title,
				notes: input.description,
				timezone: 'user',
			},
		}),
	}
}

export function organizationTemplates(): ReportTemplate[] {
	return [
		template('organization', {
			id: 'customers-by-month',
			category: 'Customers',
			title: 'Customers by month',
			description: 'Count new site customers over the last 3 months.',
			subject: 'customers',
			groupBy: ['createdAt'],
			chartStyle: 'bar',
			timeBucket: 'month',
			sortBy: 'none',
		}),
		template('organization', {
			id: 'customers-by-week',
			category: 'Customers',
			title: 'Customers by week',
			description: 'Count new site customers week by week.',
			subject: 'customers',
			groupBy: ['createdAt'],
			chartStyle: 'bar',
			timeBucket: 'week',
			sortBy: 'none',
		}),
		template('organization', {
			id: 'customer-list',
			category: 'Customers',
			title: 'Customer list',
			description:
				'A table of site customers with name, email, phone, and created date.',
			subject: 'customers',
			groupBy: [],
			chartStyle: 'table',
			columns: ['name', 'email', 'phone', 'createdAt'],
			timeframePreset: 'all_time',
			sortBy: 'none',
		}),
		template('organization', {
			id: 'customers-verified',
			category: 'Customers',
			title: 'Phone verification',
			description: 'Segment customers by whether their phone is verified.',
			subject: 'customers',
			groupBy: ['phoneVerified'],
			chartStyle: 'pie',
		}),
		template('organization', {
			id: 'notes-by-status',
			category: 'Notes',
			title: 'Notes by status',
			description: 'See how notes are distributed across board columns.',
			subject: 'notes',
			groupBy: ['status'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('organization', {
			id: 'notes-by-priority',
			category: 'Notes',
			title: 'Notes by priority',
			description: 'Count notes grouped by priority.',
			subject: 'notes',
			groupBy: ['priority'],
			chartStyle: 'bar',
			timeframePreset: 'all_time',
		}),
		template('organization', {
			id: 'members-by-role',
			category: 'Team',
			title: 'Members by role',
			description: 'Count operators in this organization by role.',
			subject: 'members',
			groupBy: ['role'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('organization', {
			id: 'feedback-by-type',
			category: 'Feedback',
			title: 'Feedback by type',
			description: 'Count in-app feedback submissions by type.',
			subject: 'feedback',
			groupBy: ['type'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('organization', {
			id: 'customer-count',
			category: 'Customers',
			title: 'Customer count',
			description:
				'A single number of site customers in the selected timeframe.',
			subject: 'customers',
			groupBy: [],
			chartStyle: 'single_number',
			timeframePreset: 'all_time',
		}),
		template('organization', {
			id: 'shop-orders-by-month',
			category: 'Shop',
			title: 'Orders by month',
			description: 'Count shop orders over the last 3 months.',
			subject: 'shop_orders',
			groupBy: ['createdAt'],
			chartStyle: 'bar',
			timeBucket: 'month',
			sortBy: 'none',
		}),
		template('organization', {
			id: 'shop-orders-by-status',
			category: 'Shop',
			title: 'Orders by status',
			description: 'See how shop orders are distributed by payment status.',
			subject: 'shop_orders',
			groupBy: ['status'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('organization', {
			id: 'shop-order-list',
			category: 'Shop',
			title: 'Order list',
			description:
				'A table of shop orders with customer, product, amount, status, and date.',
			subject: 'shop_orders',
			groupBy: [],
			chartStyle: 'table',
			columns: [
				'customerName',
				'customerPhone',
				'productName',
				'amount',
				'status',
				'createdAt',
			],
			timeframePreset: 'all_time',
			sortBy: 'none',
		}),
		template('organization', {
			id: 'shop-order-count',
			category: 'Shop',
			title: 'Order count',
			description: 'A single number of shop orders in the selected timeframe.',
			subject: 'shop_orders',
			groupBy: [],
			chartStyle: 'single_number',
			timeframePreset: 'all_time',
		}),
	]
}

export function platformTemplates(): ReportTemplate[] {
	return [
		template('platform', {
			id: 'orgs-by-region',
			category: 'Organizations',
			title: 'Organizations by region',
			description: 'Count tenants by customer data region.',
			subject: 'organizations',
			groupBy: ['dataRegion'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('platform', {
			id: 'orgs-published',
			category: 'Organizations',
			title: 'Published sites',
			description: 'How many organizations have published a public site.',
			subject: 'organizations',
			groupBy: ['sitePublished'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('platform', {
			id: 'users-by-month',
			category: 'Users',
			title: 'New operators by month',
			description: 'Count operator signups over the last 6 months.',
			subject: 'users',
			groupBy: ['createdAt'],
			chartStyle: 'bar',
			timeBucket: 'month',
			timeframePreset: 'last_6_months',
			sortBy: 'none',
		}),
		template('platform', {
			id: 'waitlist-access',
			category: 'Waitlist',
			title: 'Waitlist early access',
			description: 'Segment waitlist entries by early-access grant.',
			subject: 'waitlist',
			groupBy: ['hasEarlyAccess'],
			chartStyle: 'pie',
			timeframePreset: 'all_time',
		}),
		template('platform', {
			id: 'feedback-types',
			category: 'Feedback',
			title: 'Platform feedback',
			description: 'Count feedback across every organization by type.',
			subject: 'feedback',
			groupBy: ['type'],
			chartStyle: 'pie',
		}),
		template('platform', {
			id: 'audit-severity',
			category: 'Security',
			title: 'Audit log severity',
			description: 'Count audit events by severity.',
			subject: 'audit_logs',
			groupBy: ['severity'],
			chartStyle: 'bar',
			timeframePreset: 'last_30_days',
		}),
		template('platform', {
			id: 'user-count',
			category: 'Users',
			title: 'Operator count',
			description: 'Total operator accounts created in the selected timeframe.',
			subject: 'users',
			groupBy: [],
			chartStyle: 'single_number',
			timeframePreset: 'all_time',
		}),
	]
}

export function templatesFor(scope: ReportScope): ReportTemplate[] {
	return scope === 'platform' ? platformTemplates() : organizationTemplates()
}

export function blankReportDefinition(scope: ReportScope): ReportDefinition {
	if (scope === 'platform') {
		return createReportDefinition({
			subject: 'organizations',
			timeframe: { field: 'createdAt', preset: 'all_time' },
			groupBy: ['dataRegion'],
			timeBucket: 'month',
			columns: [],
			filters: emptyFilterGroup(),
			visualization: {
				chartStyle: 'pie',
				measure: 'count',
				sortBy: 'value_desc',
				hideCounts: false,
			},
			settings: {
				title: 'New Report',
				notes: '',
				timezone: 'user',
			},
		})
	}

	return createReportDefinition({
		subject: 'customers',
		timeframe: { field: 'createdAt', preset: 'last_3_months' },
		groupBy: [],
		timeBucket: 'month',
		columns: [],
		filters: emptyFilterGroup(),
		visualization: {
			chartStyle: 'pie',
			measure: 'count',
			sortBy: 'value_desc',
			hideCounts: false,
		},
		settings: {
			title: 'New Report',
			notes: '',
			timezone: 'user',
		},
	})
}

export function definitionForNewReport(
	scope: ReportScope,
	templateId: string | null | undefined,
): ReportDefinition {
	const template = templateId
		? templatesFor(scope).find((item) => item.id === templateId)
		: undefined
	return template?.definition ?? blankReportDefinition(scope)
}

export function templateCategories(templates: ReportTemplate[]): string[] {
	return [...new Set(templates.map((item) => item.category))]
}
