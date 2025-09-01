declare module 'hotkeys-js' {
	interface HotkeysEvent {
		key: string
		method: string
		scope: string
		shortcut: string
	}

	interface Hotkeys {
		(
			key: string,
			callback: (event: KeyboardEvent, handler: HotkeysEvent) => void,
		): void
		(
			key: string,
			scope: string,
			callback: (event: KeyboardEvent, handler: HotkeysEvent) => void,
		): void
		unbind(key: string, scope?: string): void
		setScope(scope: string): void
		getScope(): string
		deleteScope(scope: string): void
		filter(event: KeyboardEvent): boolean
	}

	const hotkeys: Hotkeys
	export default hotkeys
}
