// Organization permission constants - shared between client and server

export const ORG_PERMISSIONS = {
	// Note permissions
	CREATE_NOTE_OWN: 'create:note:own' as const,
	READ_NOTE_OWN: 'read:note:own' as const,
	READ_NOTE_ANY: 'read:note:org' as const,
	UPDATE_NOTE_OWN: 'update:note:own' as const,
	UPDATE_NOTE_ANY: 'update:note:org' as const,
	DELETE_NOTE_OWN: 'delete:note:own' as const,
	DELETE_NOTE_ANY: 'delete:note:org' as const,

	// Member permissions
	READ_MEMBER_ANY: 'read:member:any' as const,
	CREATE_MEMBER_ANY: 'create:member:any' as const,
	UPDATE_MEMBER_ANY: 'update:member:any' as const,
	DELETE_MEMBER_ANY: 'delete:member:any' as const,

	// Settings permissions
	READ_SETTINGS_ANY: 'read:settings:any' as const,
	UPDATE_SETTINGS_ANY: 'update:settings:any' as const,

	// Analytics permissions
	READ_ANALYTICS_ANY: 'read:analytics:any' as const,
} as const
