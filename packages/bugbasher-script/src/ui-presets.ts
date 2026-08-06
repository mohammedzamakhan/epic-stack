// UI Framework Presets for BugBasher
// These presets provide pre-configured UI component detectors for popular frameworks

import type { UIDetectionConfig, UIComponentDetector } from './types.js'

// Radix UI Preset
export const radixUIPreset: UIDetectionConfig = {
	modal: {
		name: 'radix-dialog',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-radix-dialog-content') ||
				element.hasAttribute('data-radix-alert-dialog-content') ||
				element.getAttribute('role') === 'dialog' ||
				element.getAttribute('role') === 'alertdialog'
			)
		},
		isTrigger: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-radix-dialog-trigger') ||
				element.hasAttribute('data-radix-alert-dialog-trigger')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.getAttribute('aria-label') ||
				element.getAttribute('data-radix-dialog-title') ||
				element
					.querySelector('[data-radix-dialog-title]')
					?.textContent?.trim() ||
				'dialog'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.id || element.getAttribute('data-testid') || 'radix-dialog'
		},
		getType: (element: HTMLElement) => {
			if (element.hasAttribute('data-radix-alert-dialog-content'))
				return 'alert dialog'
			return 'dialog'
		},
	},
	dropdown: {
		name: 'radix-select',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-radix-select-trigger') ||
				element.hasAttribute('data-radix-dropdown-menu-trigger') ||
				element.hasAttribute('data-radix-menubar-trigger')
			)
		},
		getLabel: (element: HTMLElement) => {
			const valueElement = element.querySelector('[data-radix-select-value]')
			if (valueElement) {
				return valueElement.textContent?.trim() || 'select'
			}
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'dropdown'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('data-testid') ||
				element.getAttribute('name') ||
				element.id ||
				'radix-select'
			)
		},
	},
	tab: {
		name: 'radix-tabs',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-radix-tabs-trigger') ||
				element.getAttribute('role') === 'tab'
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'tab'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('data-radix-tabs-value') ||
				element.getAttribute('aria-controls') ||
				element.id ||
				'radix-tab'
			)
		},
	},
	accordion: {
		name: 'radix-accordion',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-radix-accordion-trigger') ||
				element.hasAttribute('data-radix-collapsible-trigger')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'accordion item'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('data-radix-accordion-value') ||
				element.getAttribute('aria-controls') ||
				element.id ||
				'radix-accordion'
			)
		},
		getState: (element: HTMLElement) => {
			return element.getAttribute('data-state') === 'open'
				? 'expanded'
				: 'collapsed'
		},
	},
}

// Headless UI Preset (React)
export const headlessUIPreset: UIDetectionConfig = {
	modal: {
		name: 'headlessui-dialog',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-headlessui-dialog-panel') ||
				element.getAttribute('role') === 'dialog'
			)
		},
		isTrigger: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-headlessui-dialog-trigger') ||
				element.getAttribute('aria-haspopup') === 'dialog'
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.getAttribute('aria-label') ||
				element
					.querySelector('[data-headlessui-dialog-title]')
					?.textContent?.trim() ||
				'dialog'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.id || element.getAttribute('data-testid') || 'headlessui-dialog'
			)
		},
	},
	dropdown: {
		name: 'headlessui-listbox',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-headlessui-listbox-button') ||
				element.hasAttribute('data-headlessui-combobox-button') ||
				element.hasAttribute('data-headlessui-menu-button')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'listbox'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('data-testid') ||
				element.id ||
				'headlessui-listbox'
			)
		},
	},
	tab: {
		name: 'headlessui-tabs',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-headlessui-tabs-tab') ||
				element.getAttribute('role') === 'tab'
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'tab'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('aria-controls') || element.id || 'headlessui-tab'
			)
		},
	},
}

// Material-UI (MUI) Preset
export const muiPreset: UIDetectionConfig = {
	modal: {
		name: 'mui-dialog',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('MuiDialog-root') ||
				element.classList.contains('MuiModal-root') ||
				element.getAttribute('role') === 'dialog'
			)
		},
		getLabel: (element: HTMLElement) => {
			const title = element.querySelector('.MuiDialogTitle-root')
			return (
				title?.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'dialog'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.id || element.getAttribute('data-testid') || 'mui-dialog'
		},
	},
	dropdown: {
		name: 'mui-select',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('MuiSelect-select') ||
				element.classList.contains('MuiAutocomplete-input') ||
				element.hasAttribute('aria-haspopup')
			)
		},
		getLabel: (element: HTMLElement) => {
			const label = element
				.closest('.MuiFormControl-root')
				?.querySelector('.MuiInputLabel-root')
			return (
				label?.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				element.getAttribute('placeholder') ||
				'select'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.getAttribute('name') || element.id || 'mui-select'
		},
	},
	tab: {
		name: 'mui-tabs',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('MuiTab-root') ||
				element.getAttribute('role') === 'tab'
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'tab'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.getAttribute('aria-controls') || element.id || 'mui-tab'
		},
	},
	accordion: {
		name: 'mui-accordion',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('MuiAccordionSummary-root') ||
				element.classList.contains('MuiExpansionPanelSummary-root')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'accordion'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('aria-controls') || element.id || 'mui-accordion'
			)
		},
		getState: (element: HTMLElement) => {
			return element.getAttribute('aria-expanded') === 'true'
				? 'expanded'
				: 'collapsed'
		},
	},
}

// Bootstrap Preset
export const bootstrapPreset: UIDetectionConfig = {
	modal: {
		name: 'bootstrap-modal',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('modal') ||
				element.getAttribute('role') === 'dialog'
			)
		},
		isTrigger: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-bs-toggle') &&
				element.getAttribute('data-bs-toggle') === 'modal'
			)
		},
		getLabel: (element: HTMLElement) => {
			const title = element.querySelector('.modal-title')
			return (
				title?.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'modal'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.id || element.getAttribute('data-testid') || 'bootstrap-modal'
			)
		},
	},
	dropdown: {
		name: 'bootstrap-dropdown',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('dropdown-toggle') ||
				(element.hasAttribute('data-bs-toggle') &&
					element.getAttribute('data-bs-toggle') === 'dropdown')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'dropdown'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.id ||
				element.getAttribute('data-testid') ||
				'bootstrap-dropdown'
			)
		},
	},
	tab: {
		name: 'bootstrap-tabs',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('nav-link') ||
				(element.hasAttribute('data-bs-toggle') &&
					element.getAttribute('data-bs-toggle') === 'tab')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'tab'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('href')?.replace('#', '') ||
				element.id ||
				'bootstrap-tab'
			)
		},
	},
	accordion: {
		name: 'bootstrap-accordion',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('accordion-button') ||
				(element.hasAttribute('data-bs-toggle') &&
					element.getAttribute('data-bs-toggle') === 'collapse')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'accordion'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('data-bs-target')?.replace('#', '') ||
				element.getAttribute('aria-controls') ||
				element.id ||
				'bootstrap-accordion'
			)
		},
		getState: (element: HTMLElement) => {
			return element.getAttribute('aria-expanded') === 'true'
				? 'expanded'
				: 'collapsed'
		},
	},
}

// Base UI Preset (React)
export const baseUIPreset: UIDetectionConfig = {
	modal: {
		name: 'baseui-modal',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-baseui') &&
				element.getAttribute('data-baseui')?.includes('modal')
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.getAttribute('aria-label') ||
				element
					.querySelector('[data-baseui*="heading"]')
					?.textContent?.trim() ||
				'modal'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.id || element.getAttribute('data-testid') || 'baseui-modal'
		},
	},
	dropdown: {
		name: 'baseui-select',
		isComponent: (element: HTMLElement) => {
			return (
				element.hasAttribute('data-baseui') &&
				(element.getAttribute('data-baseui')?.includes('select') ||
					element.getAttribute('data-baseui')?.includes('combobox'))
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'select'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.getAttribute('name') || element.id || 'baseui-select'
		},
	},
}

// Ant Design Preset
export const antdPreset: UIDetectionConfig = {
	modal: {
		name: 'antd-modal',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('ant-modal') ||
				element.classList.contains('ant-drawer')
			)
		},
		getLabel: (element: HTMLElement) => {
			const title =
				element.querySelector('.ant-modal-title') ||
				element.querySelector('.ant-drawer-title')
			return (
				title?.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'modal'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.id || element.getAttribute('data-testid') || 'antd-modal'
		},
	},
	dropdown: {
		name: 'antd-select',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('ant-select-selector') ||
				element.classList.contains('ant-dropdown-trigger')
			)
		},
		getLabel: (element: HTMLElement) => {
			const selection = element.querySelector('.ant-select-selection-item')
			return (
				selection?.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'select'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.getAttribute('data-testid') || element.id || 'antd-select'
		},
	},
	tab: {
		name: 'antd-tabs',
		isComponent: (element: HTMLElement) => {
			return (
				element.classList.contains('ant-tabs-tab') ||
				element.getAttribute('role') === 'tab'
			)
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'tab'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return element.getAttribute('data-node-key') || element.id || 'antd-tab'
		},
	},
	accordion: {
		name: 'antd-collapse',
		isComponent: (element: HTMLElement) => {
			return element.classList.contains('ant-collapse-header')
		},
		getLabel: (element: HTMLElement) => {
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				'collapse panel'
			)
		},
		getIdentifier: (element: HTMLElement) => {
			return (
				element.getAttribute('aria-controls') || element.id || 'antd-collapse'
			)
		},
		getState: (element: HTMLElement) => {
			return element.getAttribute('aria-expanded') === 'true'
				? 'expanded'
				: 'collapsed'
		},
	},
}

// Custom framework detector factory
export function createCustomDetector(
	name: string,
	selectors: {
		component: string
		trigger?: string
		label?: string
		identifier?: string
	},
	options?: {
		getType?: (element: HTMLElement) => string
		getState?: (element: HTMLElement) => string
	},
): UIComponentDetector {
	return {
		name,
		isComponent: (element: HTMLElement) => {
			return element.matches(selectors.component)
		},
		isTrigger: selectors.trigger
			? (element: HTMLElement) => {
					return element.matches(selectors.trigger!)
				}
			: undefined,
		getLabel: (element: HTMLElement) => {
			if (selectors.label) {
				const labelElement = element.querySelector(selectors.label)
				if (labelElement) return labelElement.textContent?.trim() || name
			}
			return (
				element.textContent?.trim() ||
				element.getAttribute('aria-label') ||
				element.getAttribute('title') ||
				name
			)
		},
		getIdentifier: (element: HTMLElement) => {
			if (selectors.identifier) {
				const value =
					element.getAttribute(selectors.identifier) ||
					element.querySelector(selectors.identifier)?.textContent?.trim()
				if (value) return value
			}
			return (
				element.id ||
				element.getAttribute('data-testid') ||
				element.getAttribute('name') ||
				name
			)
		},
		getType: options?.getType,
		getState: options?.getState,
	}
}

// Export all presets
export const uiPresets = {
	radix: radixUIPreset,
	headlessui: headlessUIPreset,
	mui: muiPreset,
	bootstrap: bootstrapPreset,
	baseui: baseUIPreset,
	antd: antdPreset,
}

// Helper function to merge multiple presets
export function mergeUIConfigs(
	...configs: UIDetectionConfig[]
): UIDetectionConfig {
	const merged: UIDetectionConfig = {
		custom: [],
	}

	for (const config of configs) {
		if (config.modal && !merged.modal) merged.modal = config.modal
		if (config.dropdown && !merged.dropdown) merged.dropdown = config.dropdown
		if (config.tab && !merged.tab) merged.tab = config.tab
		if (config.accordion && !merged.accordion)
			merged.accordion = config.accordion
		if (config.button && !merged.button) merged.button = config.button
		if (config.form && !merged.form) merged.form = config.form
		if (config.custom) {
			merged.custom = [...(merged.custom || []), ...config.custom]
		}
	}

	return merged
}
