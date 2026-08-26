export type ReportScope = 'organization' | 'platform'
export type ReportSource = 'control-plane' | 'tenant-api'
export type ReportFieldType = 'datetime' | 'boolean' | 'enum' | 'string'

export type ReportField = {
	id: string
	label: string
	type: ReportFieldType
	description?: string
	filterable?: boolean
	groupable?: boolean
	timeframe?: boolean
	options?: Array<{ value: string; label: string }>
	/** Include this field as a list-table column. Defaults to true. */
	listable?: boolean
}

export type ReportSubject = {
	id: string
	label: string
	description: string
	scope: ReportScope
	source: ReportSource
	fields: ReportField[]
}

export type ReportCatalog = {
	scope: ReportScope
	subjects: ReportSubject[]
}

const customerFields: ReportField[] = [
	{
		id: 'createdAt',
		label: 'Created at',
		type: 'datetime',
		timeframe: true,
		groupable: true,
		description: 'When the customer first signed in on the public site.',
	},
	{
		id: 'name',
		label: 'Name',
		type: 'string',
		filterable: true,
	},
	{
		id: 'email',
		label: 'Email',
		type: 'string',
		filterable: true,
	},
	{
		id: 'phone',
		label: 'Phone',
		type: 'string',
		filterable: true,
	},
	{
		id: 'phoneVerified',
		label: 'Phone verified',
		type: 'boolean',
		filterable: true,
		groupable: true,
	},
	{
		id: 'hasEmail',
		label: 'Has email',
		type: 'boolean',
		filterable: true,
		groupable: true,
	},
]

const noteFields: ReportField[] = [
	{
		id: 'createdAt',
		label: 'Created at',
		type: 'datetime',
		timeframe: true,
		groupable: true,
	},
	{
		id: 'title',
		label: 'Title',
		type: 'string',
		filterable: true,
	},
	{
		id: 'updatedAt',
		label: 'Updated at',
		type: 'datetime',
		timeframe: true,
	},
	{
		id: 'status',
		label: 'Status',
		type: 'enum',
		filterable: true,
		groupable: true,
	},
	{
		id: 'priority',
		label: 'Priority',
		type: 'enum',
		filterable: true,
		groupable: true,
		options: [
			{ value: 'low', label: 'Low' },
			{ value: 'medium', label: 'Medium' },
			{ value: 'high', label: 'High' },
			{ value: 'urgent', label: 'Urgent' },
		],
	},
	{
		id: 'isPublic',
		label: 'Visibility',
		type: 'boolean',
		filterable: true,
		groupable: true,
	},
]

const memberFields: ReportField[] = [
	{
		id: 'createdAt',
		label: 'Joined at',
		type: 'datetime',
		timeframe: true,
		groupable: true,
	},
	{
		id: 'name',
		label: 'Name',
		type: 'string',
		filterable: true,
	},
	{
		id: 'email',
		label: 'Email',
		type: 'string',
		filterable: true,
	},
	{
		id: 'role',
		label: 'Role',
		type: 'enum',
		filterable: true,
		groupable: true,
	},
	{
		id: 'department',
		label: 'Department',
		type: 'string',
		filterable: true,
		groupable: true,
	},
	{
		id: 'active',
		label: 'Active',
		type: 'boolean',
		filterable: true,
		groupable: true,
	},
]

const feedbackFields: ReportField[] = [
	{
		id: 'createdAt',
		label: 'Submitted at',
		type: 'datetime',
		timeframe: true,
		groupable: true,
	},
	{
		id: 'type',
		label: 'Type',
		type: 'enum',
		filterable: true,
		groupable: true,
	},
]

export const organizationCatalog: ReportCatalog = {
	scope: 'organization',
	subjects: [
		{
			id: 'customers',
			label: 'Customers',
			description: 'Customers who signed in on the public site.',
			scope: 'organization',
			source: 'tenant-api',
			fields: customerFields,
		},
		{
			id: 'notes',
			label: 'Notes',
			description: 'Organization notes created by operators.',
			scope: 'organization',
			source: 'control-plane',
			fields: noteFields,
		},
		{
			id: 'members',
			label: 'Members',
			description: 'Operators who belong to this organization.',
			scope: 'organization',
			source: 'control-plane',
			fields: memberFields,
		},
		{
			id: 'feedback',
			label: 'Feedback',
			description: 'In-app feedback submitted by operators.',
			scope: 'organization',
			source: 'control-plane',
			fields: feedbackFields,
		},
	],
}

export const platformCatalog: ReportCatalog = {
	scope: 'platform',
	subjects: [
		{
			id: 'organizations',
			label: 'Organizations',
			description: 'Tenant organizations on the platform.',
			scope: 'platform',
			source: 'control-plane',
			fields: [
				{
					id: 'createdAt',
					label: 'Created at',
					type: 'datetime',
					timeframe: true,
					groupable: true,
				},
				{
					id: 'name',
					label: 'Name',
					type: 'string',
					filterable: true,
				},
				{
					id: 'slug',
					label: 'Slug',
					type: 'string',
					filterable: true,
				},
				{
					id: 'dataRegion',
					label: 'Data region',
					type: 'enum',
					filterable: true,
					groupable: true,
					options: [
						{ value: 'us', label: 'United States' },
						{ value: 'ksa', label: 'Saudi Arabia' },
					],
				},
				{
					id: 'active',
					label: 'Active',
					type: 'boolean',
					filterable: true,
					groupable: true,
				},
				{
					id: 'sitePublished',
					label: 'Site published',
					type: 'boolean',
					filterable: true,
					groupable: true,
				},
				{
					id: 'subscriptionStatus',
					label: 'Subscription',
					type: 'enum',
					filterable: true,
					groupable: true,
				},
				{
					id: 'planName',
					label: 'Plan',
					type: 'enum',
					filterable: true,
					groupable: true,
				},
			],
		},
		{
			id: 'users',
			label: 'Users',
			description: 'Operator accounts across the platform.',
			scope: 'platform',
			source: 'control-plane',
			fields: [
				{
					id: 'createdAt',
					label: 'Created at',
					type: 'datetime',
					timeframe: true,
					groupable: true,
				},
				{
					id: 'name',
					label: 'Name',
					type: 'string',
					filterable: true,
				},
				{
					id: 'username',
					label: 'Username',
					type: 'string',
					filterable: true,
				},
				{
					id: 'email',
					label: 'Email',
					type: 'string',
					filterable: true,
				},
				{
					id: 'isBanned',
					label: 'Banned',
					type: 'boolean',
					filterable: true,
					groupable: true,
				},
			],
		},
		{
			id: 'waitlist',
			label: 'Waitlist',
			description: 'Closed-beta waitlist entries.',
			scope: 'platform',
			source: 'control-plane',
			fields: [
				{
					id: 'createdAt',
					label: 'Joined at',
					type: 'datetime',
					timeframe: true,
					groupable: true,
				},
				{
					id: 'hasEarlyAccess',
					label: 'Early access',
					type: 'boolean',
					filterable: true,
					groupable: true,
				},
				{
					id: 'hasJoinedDiscord',
					label: 'Joined Discord',
					type: 'boolean',
					filterable: true,
					groupable: true,
				},
			],
		},
		{
			id: 'feedback',
			label: 'Feedback',
			description: 'Operator feedback across every organization.',
			scope: 'platform',
			source: 'control-plane',
			fields: [
				{
					id: 'createdAt',
					label: 'Submitted at',
					type: 'datetime',
					timeframe: true,
					groupable: true,
				},
				{
					id: 'type',
					label: 'Type',
					type: 'enum',
					filterable: true,
					groupable: true,
				},
			],
		},
		{
			id: 'sessions',
			label: 'Sessions',
			description: 'Operator browser sessions.',
			scope: 'platform',
			source: 'control-plane',
			fields: [
				{
					id: 'createdAt',
					label: 'Created at',
					type: 'datetime',
					timeframe: true,
					groupable: true,
				},
			],
		},
		{
			id: 'audit_logs',
			label: 'Audit logs',
			description: 'Control-plane audit events. Details stay aggregated.',
			scope: 'platform',
			source: 'control-plane',
			fields: [
				{
					id: 'createdAt',
					label: 'Occurred at',
					type: 'datetime',
					timeframe: true,
					groupable: true,
				},
				{
					id: 'action',
					label: 'Action',
					type: 'enum',
					filterable: true,
					groupable: true,
				},
				{
					id: 'severity',
					label: 'Severity',
					type: 'enum',
					filterable: true,
					groupable: true,
					options: [
						{ value: 'info', label: 'Info' },
						{ value: 'warning', label: 'Warning' },
						{ value: 'error', label: 'Error' },
						{ value: 'critical', label: 'Critical' },
					],
				},
			],
		},
	],
}

export function getCatalog(scope: ReportScope): ReportCatalog {
	return scope === 'platform' ? platformCatalog : organizationCatalog
}

export function getSubject(catalog: ReportCatalog, subjectId: string) {
	return catalog.subjects.find((subject) => subject.id === subjectId) ?? null
}

export function getField(subject: ReportSubject, fieldId: string) {
	return subject.fields.find((field) => field.id === fieldId) ?? null
}

export function timeframeFields(subject: ReportSubject) {
	return subject.fields.filter((field) => field.timeframe)
}

export function groupableFields(subject: ReportSubject) {
	return subject.fields.filter((field) => field.groupable)
}

export function filterableFields(subject: ReportSubject) {
	return subject.fields.filter((field) => field.filterable)
}

export function listableFields(subject: ReportSubject) {
	return subject.fields.filter((field) => field.listable !== false)
}

export function defaultListColumns(subject: ReportSubject) {
	const fields = listableFields(subject)
	const identity = fields.filter(
		(field) => field.type !== 'datetime' && field.type !== 'boolean',
	)
	const rest = fields.filter((field) => !identity.includes(field))
	return [...identity, ...rest].slice(0, 4).map((field) => field.id)
}

export function defaultTimeframeField(subject: ReportSubject) {
	return timeframeFields(subject)[0] ?? subject.fields[0]
}
