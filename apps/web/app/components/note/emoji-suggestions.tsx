import { computePosition } from '@floating-ui/dom'
import { type EmojiItem } from '@tiptap/extension-emoji'
import { ReactRenderer, type Editor } from '@tiptap/react'
import { type SuggestionOptions } from '@tiptap/suggestion'

import { EmojiList } from './emoji-list'

interface SuggestionItemsProps {
	editor: Editor
	query: string
}

export default function getEmojiSuggestion(): Omit<
	SuggestionOptions<any, any>,
	'editor'
> {
	return {
		items: ({ editor, query }: SuggestionItemsProps): EmojiItem[] => {
			return (editor.storage.emoji.emojis as EmojiItem[])
				.filter(({ shortcodes, tags }: EmojiItem) => {
					return (
						shortcodes?.find((shortcode: string) =>
							shortcode.startsWith(query.toLowerCase()),
						) ||
						tags?.find((tag: string) => tag.startsWith(query.toLowerCase()))
					)
				})
				.slice(0, 10)
		},

		allowSpaces: false,

		render: () => {
			let component: ReactRenderer<any, any> | null = null

			function repositionComponent(clientRect: DOMRect): void {
				if (!component || !component.element) {
					return
				}

				const virtualElement = {
					getBoundingClientRect(): DOMRect {
						return clientRect
					},
				}

				void computePosition(virtualElement, component.element as HTMLElement, {
					placement: 'bottom-start',
					strategy: 'fixed',
				}).then((pos) => {
					if (component?.element) {
						const element = component.element as HTMLElement
						Object.assign(element.style, {
							left: `${pos.x}px`,
							top: `${pos.y}px`,
							position: 'fixed',
							zIndex: '9999',
						})
					}
				})
			}

			return {
				onStart: (props: any): void => {
					if (!props.clientRect) {
						return
					}

					component = new ReactRenderer(EmojiList, {
						props,
						editor: props.editor,
					})

					document.body.appendChild(component.element)
					repositionComponent(props.clientRect())
				},

				onUpdate(props: any): void {
					if (!component) return

					component.updateProps(props)

					if (!props.clientRect) {
						return
					}

					repositionComponent(props.clientRect())
				},

				onKeyDown(props: any): boolean {
					if (!component) return false

					if (props.event.key === 'Escape') {
						if (
							component.element &&
							document.body.contains(component.element)
						) {
							document.body.removeChild(component.element)
						}
						component.destroy()
						return true
					}

					return (component.ref as any)?.onKeyDown?.(props) ?? false
				},

				onExit(): void {
					if (component?.element && document.body.contains(component.element)) {
						document.body.removeChild(component.element)
					}
					component?.destroy()
				},
			}
		},
	}
}
