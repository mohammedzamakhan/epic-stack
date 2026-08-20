export * from './src/generated-types.ts'

export type JsonValue =
	string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type InputJsonValue = JsonValue
