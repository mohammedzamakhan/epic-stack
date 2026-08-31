import { type HTMLAttributes, useEffect, useRef } from 'react'

type SanitizedHtmlProps = Omit<
	HTMLAttributes<HTMLDivElement>,
	'dangerouslySetInnerHTML'
> & {
	html: string
}

/**
 * Renders pre-sanitized HTML. Callers must pass content through DOMPurify first.
 */
export function SanitizedHtml({ html, ...props }: SanitizedHtmlProps) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (ref.current) {
			ref.current.innerHTML = html
		}
	}, [html])

	return <div ref={ref} {...props} />
}
