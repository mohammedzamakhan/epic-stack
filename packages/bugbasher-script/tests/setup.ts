// Test setup file
import { vi } from 'vitest'

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => {
	let state = 'inactive'
	let ondataavailable: ((event: any) => void) | null = null
	let onstop: (() => void) | null = null

	const mockRecorder = {
		start: vi.fn().mockImplementation(() => {
			state = 'recording'
			// Simulate data available event after a short delay
			setTimeout(() => {
				if (ondataavailable) {
					ondataavailable({
						data: new Blob(['mock-video-data'], { type: 'video/webm' }),
					})
				}
			}, 10)
		}),
		stop: vi.fn().mockImplementation(() => {
			if (state === 'recording') {
				state = 'inactive'
				// Simulate stop event
				setTimeout(() => {
					if (onstop) {
						onstop()
					}
				}, 10)
			}
		}),
		pause: vi.fn(),
		resume: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
		get state() {
			return state
		},
		mimeType: 'video/webm',
		get ondataavailable() {
			return ondataavailable
		},
		set ondataavailable(handler) {
			ondataavailable = handler
		},
		onerror: null,
		onpause: null,
		onresume: null,
		onstart: null,
		get onstop() {
			return onstop
		},
		set onstop(handler) {
			onstop = handler
		},
	}

	return mockRecorder
}) as any

MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true)

// Mock getDisplayMedia
Object.defineProperty(navigator, 'mediaDevices', {
	writable: true,
	value: {
		getDisplayMedia: vi.fn().mockResolvedValue({
			getTracks: () => [{ stop: vi.fn(), addEventListener: vi.fn() }],
			getVideoTracks: () => [{ addEventListener: vi.fn() }],
		}),
	},
})

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
	postMessage: vi.fn(),
	close: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
})) as any

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn((key: string) => {
		const data = localStorageMock._storage[key]
		return data || null
	}),
	setItem: vi.fn((key: string, value: string) => {
		localStorageMock._storage[key] = value
	}),
	removeItem: vi.fn((key: string) => {
		delete localStorageMock._storage[key]
	}),
	clear: vi.fn(() => {
		localStorageMock._storage = {}
	}),
	length: 0,
	key: vi.fn(),
	_storage: {} as Record<string, string>,
}

Object.defineProperty(window, 'localStorage', {
	value: localStorageMock,
})

// Mock window.open
window.open = vi.fn()

// Mock alert
window.alert = vi.fn()

// Mock shadow DOM support for jsdom
if (!Element.prototype.attachShadow) {
	Element.prototype.attachShadow = function (options) {
		// Return the element itself as a fallback
		return this as any
	}
}
