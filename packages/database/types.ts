export * from './src/generated-types'

export type JsonValue =
	string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type InputJsonValue = JsonValue
