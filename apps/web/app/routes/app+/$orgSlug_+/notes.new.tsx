import { type LoaderFunctionArgs } from 'react-router'
import { SheetHeader, SheetTitle } from '#app/components/ui/sheet.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { OrgNoteEditor } from './__org-note-editor.tsx'

export { action } from './__org-note-editor.server.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	return {}
}

export default function NewNote() {
	return (
		<>
			<SheetHeader className="border-b">
				<SheetTitle>Create New Note</SheetTitle>
			</SheetHeader>

			<section
				className="flex flex-1 flex-col min-h-0"
				aria-labelledby="new-note-title"
				tabIndex={-1}
			>
				<OrgNoteEditor />
			</section>
		</>
	)
}
