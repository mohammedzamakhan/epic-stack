'use strict'

import videojs from 'video.js'
import { createRoot, Root } from 'react-dom/client'

export interface Marker {
	time: number
	duration?: number
	text?: string
	class?: string
	overlayText?: string
	key?: string
	label?: string
	component?: React.ReactNode
}

export interface MarkersOptions {
	markerStyle?: Record<string, string>
	markerTip?: {
		display?: boolean
		text?: (marker: Marker) => string
		time?: (marker: Marker) => number
		html?: (marker: Marker) => string
	}
	breakOverlay?: {
		display?: boolean
		displayTime?: number
		text?: (marker: Marker) => string
		style?: Record<string, string>
	}
	onMarkerClick?: (marker: Marker) => boolean | void
	onMarkerReached?: (marker: Marker, index: number) => void
	onMarkerAdded?: (marker: Marker, element: HTMLElement) => void
	onMarkerRemoved?: (marker: Marker) => void
	markers?: Marker[]

	onTimeUpdateAfterMarkerUpdate?: () => void
}

// default setting
const defaultSetting: Required<
	Omit<MarkersOptions, 'onTimeUpdateAfterMarkerUpdate'>
> = {
	markerStyle: {
		width: '7px',
		'border-radius': '30%',
		'background-color': 'red',
	},
	markerTip: {
		display: true,
		text: function (marker: Marker) {
			return 'Break: ' + marker.text
		},
		time: function (marker: Marker) {
			return marker.time
		},
	},
	breakOverlay: {
		display: false,
		displayTime: 3,
		text: function (marker: Marker) {
			return 'Break overlay: ' + marker.overlayText
		},
		style: {
			width: '100%',
			height: '20%',
			'background-color': 'rgba(0,0,0,0.7)',
			color: 'white',
			'font-size': '17px',
		},
	},
	onMarkerClick: function (marker: Marker) {},
	onMarkerReached: function (marker: Marker, index: number) {},
	markers: [],
}

// create a non-colliding random number
function generateUUID(): string {
	var d = new Date().getTime()
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		var r = ((d + Math.random() * 16) % 16) | 0
		d = Math.floor(d / 16)
		return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16)
	})
	return uuid
}

/**
 * Returns the size of an element and its position
 * a default Object with 0 on each of its properties
 * its return in case there's an error
 * @param  {Element} element  el to get the size and position
 * @return {DOMRect|Object}   size and position of an element
 */
function getElementBounding(element: HTMLElement) {
	var elementBounding
	const defaultBoundingRect = {
		top: 0,
		bottom: 0,
		left: 0,
		width: 0,
		height: 0,
		right: 0,
	}

	try {
		elementBounding = element.getBoundingClientRect()
	} catch (e) {
		elementBounding = defaultBoundingRect
	}

	return elementBounding
}

const NULL_INDEX = -1

function registerVideoJsMarkersPlugin(this: any, options: MarkersOptions) {
	/**
	 * register the markers plugin (dependent on jquery)
	 */
	// @ts-ignore
	const mergeOptions = videojs.obj?.merge || videojs.mergeOptions
	let setting: any = mergeOptions(defaultSetting, options),
		markersMap: { [key: string]: Marker } = {},
		markersList: Array<Marker> = [], // list of markers sorted by time
		currentMarkerIndex = NULL_INDEX,
		player = this,
		markerTip: HTMLElement | null = null,
		breakOverlay: HTMLElement | null = null,
		overlayIndex = NULL_INDEX,
		rootsMap: Map<string, Root> = new Map()

	function sortMarkersList(): void {
		// sort the list by time in asc order
		markersList.sort((a, b) => {
			return (
				(setting.markerTip.time?.(a) ?? a.time) -
				(setting.markerTip.time?.(b) ?? b.time)
			)
		})
	}

	function addMarkers(newMarkers: Array<Marker>): void {
		console.log('addMarkers called with:', newMarkers.length, 'markers')
		newMarkers.forEach((marker: Marker) => {
			marker.key = generateUUID()

			const progressHolder = player.el().querySelector('.vjs-progress-holder')
			if (progressHolder) {
				console.log('Found progressHolder, appending markerDiv')
				const markerDiv = createMarkerDiv(marker)
				progressHolder.appendChild(markerDiv)

				if (marker.component) {
					console.log('Marker has component, creating React root')
					try {
						const root = createRoot(markerDiv)
						root.render(marker.component)
						if (marker.key) {
							rootsMap.set(marker.key, root)
						}
						console.log('React root.render called')
					} catch (err) {
						console.error('Failed to create React root or render:', err)
					}
				}

				// Update style after appending to handle dynamic width from labels
				setMarkderDivStyle(marker, markerDiv)

				if (typeof setting.onMarkerAdded === 'function') {
					setting.onMarkerAdded(marker, markerDiv)
				}
			}

			// store marker in an internal hash map
			markersMap[marker.key] = marker
			markersList.push(marker)
		})

		sortMarkersList()
	}

	function getPosition(marker: Marker): number {
		return (
			((setting.markerTip.time?.(marker) ?? marker.time) / player.duration()) *
			100
		)
	}

	function setMarkderDivStyle(marker: Marker, markerDiv: HTMLElement): void {
		markerDiv.className = `vjs-marker ${marker.class || ''}`

		Object.keys(setting.markerStyle).forEach((key) => {
			// @ts-ignore
			markerDiv.style[key] = setting.markerStyle[key]
		})

		// hide out-of-bound markers
		const ratio = marker.time / player.duration()
		if (ratio < 0 || ratio > 1) {
			markerDiv.style.display = 'none'
		}

		// set position
		markerDiv.style.left = getPosition(marker) + '%'
		if (marker.duration) {
			markerDiv.style.width = (marker.duration / player.duration()) * 100 + '%'
			markerDiv.style.marginLeft = '0px'
		} else {
			const markerDivBounding = getElementBounding(markerDiv)
			markerDiv.style.marginLeft = -(markerDivBounding.width / 2) + 'px'
		}
	}

	function createMarkerDiv(marker: Marker): HTMLElement {
		// @ts-ignore
		var markerDiv = videojs.dom.createEl(
			'div',
			{},
			{
				'data-marker-key': marker.key,
				'data-marker-time': setting.markerTip.time?.(marker) ?? marker.time,
			},
		)

		setMarkderDivStyle(marker, markerDiv)

		// bind click event to seek to marker time
		markerDiv.addEventListener('click', function (this: HTMLElement, e: Event) {
			e.preventDefault()
			e.stopPropagation()
			var preventDefault = false
			if (typeof setting.onMarkerClick === 'function') {
				// if return false, prevent default behavior
				preventDefault = setting.onMarkerClick(marker) === false
			}

			if (!preventDefault) {
				var key = this.getAttribute('data-marker-key')
				if (key) {
					player.currentTime(
						setting.markerTip.time?.(markersMap[key]) ?? markersMap[key].time,
					)
				}
			}
		})

		if (setting.markerTip.display) {
			registerMarkerTipHandler(markerDiv)
		}

		return markerDiv
	}

	function updateMarkers(force: boolean): void {
		// update UI for markers whose time changed
		markersList.forEach((marker: Marker) => {
			var markerDiv = player
				.el()
				.querySelector(".vjs-marker[data-marker-key='" + marker.key + "']")
			var markerTime = setting.markerTip.time?.(marker) ?? marker.time

			if (
				markerDiv &&
				(force ||
					markerDiv.getAttribute('data-marker-time') !== String(markerTime))
			) {
				setMarkderDivStyle(marker, markerDiv)
				markerDiv.setAttribute('data-marker-time', String(markerTime))
			}
		})
		sortMarkersList()
	}

	function removeMarkers(indexArray: Array<number>): void {
		// reset overlay
		if (!!breakOverlay) {
			overlayIndex = NULL_INDEX
			breakOverlay.style.visibility = 'hidden'
		}
		currentMarkerIndex = NULL_INDEX

		let deleteIndexList: Array<number> = []
		indexArray.forEach((index: number) => {
			let marker = markersList[index]
			if (marker && marker.key) {
				// delete from memory
				delete markersMap[marker.key]
				deleteIndexList.push(index)

				// delete from dom
				let el = player
					.el()
					.querySelector(".vjs-marker[data-marker-key='" + marker.key + "']")
				if (el) {
					const root = rootsMap.get(marker.key)
					if (root) {
						root.unmount()
						rootsMap.delete(marker.key)
					}
					el.parentNode.removeChild(el)
				}

				if (typeof setting.onMarkerRemoved === 'function') {
					setting.onMarkerRemoved(marker)
				}
			}
		})

		// clean up markers array
		deleteIndexList.sort((a, b) => b - a) // sort descending
		deleteIndexList.forEach((deleteIndex: number) => {
			markersList.splice(deleteIndex, 1)
		})

		// sort again
		sortMarkersList()
	}

	// attach hover event handler
	function registerMarkerTipHandler(markerDiv: HTMLElement): void {
		markerDiv.addEventListener('mouseover', () => {
			const key = markerDiv.getAttribute('data-marker-key')
			if (!key) return
			var marker = markersMap[key]
			if (!!markerTip) {
				const tipInner = markerTip.querySelector(
					'.vjs-tip-inner',
				) as HTMLElement
				if (tipInner) {
					if (setting.markerTip.html) {
						tipInner.innerHTML = setting.markerTip.html(marker)
					} else if (setting.markerTip.text) {
						tipInner.innerText = setting.markerTip.text(marker)
					}
				}
				// margin-left needs to minus the padding length to align correctly with the marker
				markerTip.style.left = getPosition(marker) + '%'
				var markerTipBounding = getElementBounding(markerTip)
				var markerDivBounding = getElementBounding(markerDiv)
				markerTip.style.marginLeft =
					-parseFloat(String(markerTipBounding.width / 2)) +
					parseFloat(String(markerDivBounding.width / 4)) +
					'px'
				markerTip.style.visibility = 'visible'
			}
		})

		markerDiv.addEventListener('mouseout', () => {
			if (!!markerTip) {
				markerTip.style.visibility = 'hidden'
			}
		})
	}

	function initializeMarkerTip(): void {
		// @ts-ignore
		markerTip = videojs.dom.createEl('div', {
			className: 'vjs-tip',
			innerHTML:
				"<div class='vjs-tip-arrow'></div><div class='vjs-tip-inner'></div>",
		})
		const progressHolder = player.el().querySelector('.vjs-progress-holder')
		if (progressHolder && markerTip) {
			progressHolder.appendChild(markerTip)
		}
	}

	// show or hide break overlays
	function updateBreakOverlay(): void {
		if (!setting.breakOverlay.display || currentMarkerIndex < 0) {
			return
		}

		var currentTime = player.currentTime()
		var marker = markersList[currentMarkerIndex]
		var markerTime = setting.markerTip.time?.(marker) ?? marker.time

		if (
			currentTime >= markerTime &&
			currentTime <= markerTime + setting.breakOverlay.displayTime
		) {
			if (overlayIndex !== currentMarkerIndex) {
				overlayIndex = currentMarkerIndex
				if (breakOverlay) {
					const overlayText = breakOverlay.querySelector(
						'.vjs-break-overlay-text',
					)
					if (overlayText && setting.breakOverlay.text) {
						overlayText.innerHTML = setting.breakOverlay.text(marker)
					}
				}
			}

			if (breakOverlay) {
				breakOverlay.style.visibility = 'visible'
			}
		} else {
			overlayIndex = NULL_INDEX
			if (breakOverlay) {
				breakOverlay.style.visibility = 'hidden'
			}
		}
	}

	// problem when the next marker is within the overlay display time from the previous marker
	function initializeOverlay(): void {
		// @ts-ignore
		breakOverlay = videojs.dom.createEl('div', {
			className: 'vjs-break-overlay',
			innerHTML: "<div class='vjs-break-overlay-text'></div>",
		})
		if (breakOverlay) {
			Object.keys(setting.breakOverlay.style).forEach((key) => {
				if (breakOverlay) {
					// @ts-ignore
					breakOverlay.style[key] = setting.breakOverlay.style[key]
				}
			})
			player.el().appendChild(breakOverlay)
		}
		overlayIndex = NULL_INDEX
	}

	function onTimeUpdate(): void {
		onUpdateMarker()
		updateBreakOverlay()
		options.onTimeUpdateAfterMarkerUpdate &&
			options.onTimeUpdateAfterMarkerUpdate()
	}

	function onUpdateMarker() {
		/*
      check marker reached in between markers
      the logic here is that it triggers a new marker reached event only if the player
      enters a new marker range (e.g. from marker 1 to marker 2). Thus, if player is on marker 1 and user clicked on marker 1 again, no new reached event is triggered)
    */
		if (!markersList.length) {
			return
		}

		var getNextMarkerTime = (index: number) => {
			if (index < markersList.length - 1) {
				return (
					setting.markerTip.time?.(markersList[index + 1]) ??
					markersList[index + 1].time
				)
			}
			// next marker time of last marker would be end of video time
			return player.duration()
		}
		var currentTime = player.currentTime()
		var newMarkerIndex = NULL_INDEX

		if (currentMarkerIndex !== NULL_INDEX) {
			// check if staying at same marker
			var nextMarkerTime = getNextMarkerTime(currentMarkerIndex)
			if (
				currentTime >=
					(setting.markerTip.time?.(markersList[currentMarkerIndex]) ??
						markersList[currentMarkerIndex].time) &&
				currentTime < nextMarkerTime
			) {
				return
			}

			// check for ending (at the end current time equals player duration)
			if (
				currentMarkerIndex === markersList.length - 1 &&
				currentTime === player.duration()
			) {
				return
			}
		}

		// check first marker, no marker is selected
		if (
			currentTime <
			(setting.markerTip.time?.(markersList[0]) ?? markersList[0].time)
		) {
			newMarkerIndex = NULL_INDEX
		} else {
			// look for new index
			for (var i = 0; i < markersList.length; i++) {
				nextMarkerTime = getNextMarkerTime(i)
				if (
					currentTime >=
						(setting.markerTip.time?.(markersList[i]) ?? markersList[i].time) &&
					currentTime < nextMarkerTime
				) {
					newMarkerIndex = i
					break
				}
			}
		}

		// set new marker index
		if (newMarkerIndex !== currentMarkerIndex) {
			// trigger event if index is not null
			if (newMarkerIndex !== NULL_INDEX && options.onMarkerReached) {
				options.onMarkerReached(markersList[newMarkerIndex], newMarkerIndex)
			}
			currentMarkerIndex = newMarkerIndex
		}
	}

	// setup the whole thing
	function initialize(): void {
		if (setting.markerTip.display) {
			initializeMarkerTip()
		}

		// remove existing markers if already initialized
		player.markers.removeAll()
		addMarkers(setting.markers || [])

		if (setting.breakOverlay.display) {
			initializeOverlay()
		}
		onTimeUpdate()
		player.on('timeupdate', onTimeUpdate)
	}

	// setup the plugin after we loaded video's meta data
	player.on('loadedmetadata', function () {
		initialize()
	})

	// exposed plugin API
	player.markers = {
		getMarkers: function (): Array<Marker> {
			return markersList
		},
		next: function (): void {
			// go to the next marker from current timestamp
			const currentTime = player.currentTime()
			for (var i = 0; i < markersList.length; i++) {
				var markerTime =
					setting.markerTip.time?.(markersList[i]) ?? markersList[i].time
				if (markerTime > currentTime) {
					player.currentTime(markerTime)
					break
				}
			}
		},
		prev: function (): void {
			// go to previous marker
			const currentTime = player.currentTime()
			for (var i = markersList.length - 1; i >= 0; i--) {
				var markerTime =
					setting.markerTip.time?.(markersList[i]) ?? markersList[i].time
				// add a threshold
				if (markerTime + 0.5 < currentTime) {
					player.currentTime(markerTime)
					return
				}
			}
		},
		add: function (newMarkers: Array<Marker>): void {
			// add new markers given an array of index
			addMarkers(newMarkers)
		},
		remove: function (indexArray: Array<number>): void {
			// remove markers given an array of index
			removeMarkers(indexArray)
		},
		removeAll: function (): void {
			var indexArray = []
			for (var i = 0; i < markersList.length; i++) {
				indexArray.push(i)
			}
			removeMarkers(indexArray)
		},
		// force - force all markers to be updated, regardless of if they have changed or not.
		updateTime: function (force: boolean): void {
			// notify the plugin to update the UI for changes in marker times
			updateMarkers(force)
		},
		reset: function (newMarkers: Array<Marker>): void {
			// remove all the existing markers and add new ones
			player.markers.removeAll()
			addMarkers(newMarkers)
		},
		destroy: function (): void {
			// unregister the plugins and clean up even handlers
			player.markers.removeAll()
			rootsMap.forEach((root) => root.unmount())
			rootsMap.clear()
			breakOverlay && breakOverlay.remove()
			markerTip && markerTip.remove()
			player.off('timeupdate', onTimeUpdate)
			delete player.markers
		},
	}
}

// @ts-ignore
videojs.registerPlugin('markers', registerVideoJsMarkersPlugin)
