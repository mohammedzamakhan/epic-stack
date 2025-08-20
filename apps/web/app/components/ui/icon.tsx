// Web app Icon component - integrates sly-generated sprites with generic Icon component
import { type SVGProps } from 'react'
import { Icon as BaseIcon, type IconName as UIIconName, type IconSize } from '@repo/ui'
import href from './icons/sprite.svg'
import { type IconName } from '@/icon-name'

export { href }
export { IconName }
export type Size = IconSize

/**
 * Web app Icon component with full type safety from sly-generated IconName types.
 * 
 * This component wraps the generic Icon from @repo/ui and provides:
 * - Automatic sprite URL from sly build system
 * - Type-safe icon names from generated types
 * - All the same props and behavior as the original Icon
 * 
 * Renders an SVG icon. The icon defaults to the size of the font. To make it
 * align vertically with neighboring text, you can pass the text as a child of
 * the icon and it will be automatically aligned.
 * Alternatively, if you're not ok with the icon being to the left of the text,
 * you need to wrap the icon and text in a common parent and set the parent to
 * display "flex" (or "inline-flex") with "items-center" and a reasonable gap.
 *
 * Pass `title` prop to the `Icon` component to get `<title>` element rendered
 * in the SVG container, providing this way for accessibility.
 */
export function Icon({
	name,
	size = 'font',
	className,
	title,
	children,
	...props
}: SVGProps<SVGSVGElement> & {
	name: IconName
	size?: IconSize
	title?: string
}) {
	return (
		<BaseIcon
			name={name as UIIconName}
			size={size}
			className={className}
			title={title}
			{...props}
		>
			{children}
		</BaseIcon>
	)
}
