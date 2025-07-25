import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useState } from 'react'
import {
	redirect,
	type ActionFunctionArgs,
	Link,
	useActionData,
} from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import { Input } from '#app/components/ui/input'
import { Label } from '#app/components/ui/label'
import { PageTitle } from '#app/components/ui/page-title'
import { Textarea } from '#app/components/ui/textarea'

import { requireUserId } from '#app/utils/auth.server'
import { createOrganization } from '#app/utils/organizations.server'
import { uploadOrganizationImage } from '#app/utils/storage.server'

// Photo upload schema
const MAX_SIZE = 1024 * 1024 * 5 // 5MB

const CreateOrganizationSchema = z.object({
	name: z.string().min(2, { message: 'Organization name is required' }),
	slug: z
		.string()
		.min(2, { message: 'Slug is required' })
		.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
			message:
				'Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen',
		}),
	description: z.string().optional(),
	logoFile: z
		.instanceof(File)
		.optional()
		.refine(
			(file) => !file || file.size <= MAX_SIZE,
			'Image size must be less than 5MB',
		)
		.refine(
			(file) =>
				!file || ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type),
			'Only .jpg, .jpeg, and .png files are accepted.',
		),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	const formData = await request.formData()
	const submission = await parseWithZod(formData, {
		schema: CreateOrganizationSchema,
		async: true,
	})

	if (submission.status !== 'success') {
		return submission.reply()
	}

	const { name, slug, description, logoFile } = submission.value

	try {
		// Process image upload if exists
		let imageObjectKey: string | undefined
		if (logoFile && logoFile instanceof File && logoFile.size > 0) {
			// Upload the image to storage and get the object key
			imageObjectKey = await uploadOrganizationImage(userId, logoFile)
		}

		const organization = await createOrganization({
			name,
			slug,
			description,
			userId,
			imageObjectKey,
		})

		return redirect(`/app/${organization.slug}`)
	} catch (error) {
		console.error('Failed to create organization', error)
		return submission.reply({
			formErrors: ['Failed to create organization'],
		})
	}
}

export default function CreateOrganizationPage() {
	const actionData = useActionData<typeof action>()
	const [previewImage, setPreviewImage] = useState<string | null>(null)

	const [form, fields] = useForm({
		id: 'create-organization',
		constraint: getZodConstraint(CreateOrganizationSchema),
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateOrganizationSchema })
		},
	})

	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = (ev) => setPreviewImage(ev.target?.result as string)
			reader.readAsDataURL(file)
		}
	}

	return (
		<div className="container max-w-lg py-8">
			<div className="mb-6">
				<PageTitle
					title="Add your organization"
					description="We just need some basic info to get your organization set up. You'll be able to edit this later."
				/>
			</div>

			<form
				method="post"
				className="space-y-6"
				encType="multipart/form-data"
				{...getFormProps(form)}
			>
				<div className="space-y-5">
					<div>
						<Label htmlFor={fields.logoFile.id}>Logo</Label>
						<div className="mt-2">
							<div className="flex items-center">
								<div className="bg-muted border-input relative flex size-16 items-center justify-center overflow-hidden rounded-md border">
									{previewImage ? (
										<img
											src={previewImage}
											alt="Organization logo preview"
											className="size-full object-cover"
										/>
									) : (
										<div className="flex flex-col items-center justify-center text-xs text-gray-500">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="20"
												height="20"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												className="mb-1"
											>
												<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
												<line x1="16" x2="22" y1="5" y2="5" />
												<line x1="19" x2="19" y1="2" y2="8" />
												<circle cx="9" cy="9" r="2" />
												<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
											</svg>
										</div>
									)}
								</div>
								<div className="ml-4">
									<input
										{...getInputProps(fields.logoFile, { type: 'file' })}
										accept="image/png,image/jpeg"
										className="sr-only"
										onChange={handleImageChange}
									/>
									<Button type="button" variant="outline" size="sm" asChild>
										<label
											htmlFor={fields.logoFile.id}
											className="cursor-pointer"
										>
											Upload your logo
										</label>
									</Button>
									<p className="mt-1 text-xs text-gray-500">
										*.png, *.jpeg files up to 5 MB
									</p>
								</div>
							</div>
							<ErrorList
								errors={fields.logoFile.errors}
								id={fields.logoFile.id}
							/>
						</div>
					</div>

					<div>
						<Label htmlFor={fields.name.id}>
							Name<span className="text-red-500">*</span>
						</Label>
						<Input
							{...getInputProps(fields.name, { type: 'text' })}
							placeholder="Acme Inc."
							className="mt-1"
						/>
						<ErrorList errors={fields.name.errors} id={fields.name.id} />
					</div>

					<div>
						<Label htmlFor={fields.slug.id}>
							Slug<span className="text-red-500">*</span>
						</Label>
						<div className="mt-1 flex items-center">
							<div className="pr-1 text-sm text-gray-500">/app/</div>
							<Input
								{...getInputProps(fields.slug, { type: 'text' })}
								placeholder="acme"
								className="flex-1"
							/>
						</div>
						<ErrorList errors={fields.slug.errors} id={fields.slug.id} />
					</div>

					<div>
						<Label htmlFor={fields.description.id}>Description</Label>
						<Textarea
							{...getInputProps(fields.description, { type: 'text' })}
							className="mt-1"
							rows={3}
						/>
						<ErrorList
							errors={fields.description.errors}
							id={fields.description.id}
						/>
					</div>
				</div>

				<ErrorList errors={form.errors} id={form.errorId} />

				<div className="flex justify-end gap-4 pt-4">
					<Button variant="outline" asChild>
						<Link to="/settings/organizations">Cancel</Link>
					</Button>
					<Button type="submit">Create Organization</Button>
				</div>
			</form>
		</div>
	)
}
