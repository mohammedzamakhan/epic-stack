import { generateRandomString } from '@oslojs/crypto/random'

function webCrypto(): Crypto {
	const cryptoRef = globalThis.crypto
	if (!cryptoRef || typeof cryptoRef.getRandomValues !== 'function') {
		throw new Error('Web Crypto getRandomValues is unavailable')
	}
	return cryptoRef
}

export async function encrypt(value: string, seed: string) {
	const cryptoRef = webCrypto()
	const iv = cryptoRef.getRandomValues(new Uint8Array(12))
	const key = await deriveKeyForEncoding(seed)
	const encrypted = await cryptoRef.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(value),
	)
	const resultBuffer = new Uint8Array(iv.byteLength + encrypted.byteLength)
	resultBuffer.set(iv)
	resultBuffer.set(new Uint8Array(encrypted), iv.byteLength)
	return btoa(String.fromCharCode(...resultBuffer))
}

export async function decrypt(value: string, seed: string) {
	const cryptoRef = webCrypto()
	const encryptedBuffer = base64ToArrayBuffer(value)
	const iv = encryptedBuffer.slice(0, 12)
	const ciphertext = encryptedBuffer.slice(12)
	const key = await deriveKeyForDecoding(seed)
	const decrypted = await cryptoRef.subtle.decrypt(
		{ name: 'AES-GCM', iv },
		key,
		ciphertext,
	)
	return new TextDecoder().decode(decrypted)
}

export function randomString(bytes = 10) {
	const cryptoRef = webCrypto()
	const random = {
		read(buffer: Uint8Array) {
			cryptoRef.getRandomValues(buffer)
		},
	}
	const alphabet =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'
	return generateRandomString(random, alphabet, bytes)
}

async function deriveKeyForEncoding(seed: string) {
	const cryptoRef = webCrypto()
	const hash = await cryptoRef.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(seed),
	)
	return cryptoRef.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt'])
}

async function deriveKeyForDecoding(seed: string) {
	const cryptoRef = webCrypto()
	const hash = await cryptoRef.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(seed),
	)
	return cryptoRef.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
		'encrypt',
		'decrypt',
	])
}

function base64ToArrayBuffer(base64: string) {
	const binaryString = atob(base64)
	const buffer = new Uint8Array(binaryString.length)
	for (let i = 0; i < binaryString.length; i++) {
		buffer[i] = binaryString.charCodeAt(i)
	}
	return buffer
}
