/// <reference types="vite/client" />

declare module '*.css?inline' {
	const content: string
	export default content
}

declare module '*.tsx?script' {
	const content: string
	export default content
}

declare module '*.ts?script' {
	const content: string
	export default content
}
