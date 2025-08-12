import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
	FormProvider,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import slugify from '@sindresorhus/slugify'
import { useState, useEffect } from 'react'
import {
	redirect,
	type ActionFunctionArgs,
	Link,
	useActionData,
	useSearchParams,
} from 'react-router'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms'
import { Button } from '#app/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input'
import { Label } from '#app/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select'
import { Textarea } from '#app/components/ui/textarea'

import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import {
	createOrganizationInvitation,
	sendOrganizationInvitationEmail,
} from '#app/utils/organization-invitation.server'
import { createOrganization } from '#app/utils/organizations.server'
import { uploadOrganizationImage } from '#app/utils/storage.server'

// Photo upload schema
const MAX_SIZE = 1024 * 1024 * 5 // 5MB

const organizationSizes = [
	{ value: '1-10', label: '1-10 employees' },
	{ value: '11-50', label: '11-50 employees' },
	{ value: '51-200', label: '51-200 employees' },
	{ value: '201-500', label: '201-500 employees' },
	{ value: '501-1000', label: '501-1000 employees' },
	{ value: '1000+', label: '1000+ employees' },
]

const departments = [
	{ value: 'engineering', label: 'Engineering' },
	{ value: 'design', label: 'Design' },
	{ value: 'quality-assurance', label: 'Quality Assurance' },
	{ value: 'product', label: 'Product' },
	{ value: 'support', label: 'Support' },
	{ value: 'sales', label: 'Sales' },
	{ value: 'marketing', label: 'Marketing' },
	{ value: 'operations', label: 'Operations' },
	{ value: 'finance', label: 'Finance' },
	{ value: 'hr', label: 'Human Resources' },
	{ value: 'other', label: 'Other' },
]

// Step 1: Basic organization info
const Step1Schema = z.object({
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

// Step 2: Invitations (handled by OrganizationInvitations component)
const InviteSchema = z.object({
	invites: z
		.array(
			z.object({
				email: z.string().email('Invalid email address'),
				role: z.enum(['admin', 'member']),
			}),
		)
		.optional(),
})

// Step 3: Additional info
const Step3Schema = z.object({
	organizationSize: z
		.string()
		.min(1, { message: 'Organization size is required' }),
	userDepartment: z.string().min(1, { message: 'Department is required' }),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent') as string
	formData.get('step') as string

	// Handle step 1: Create organization
	if (intent === 'create-organization') {
		const submission = await parseWithZod(formData, {
			schema: Step1Schema,
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
				imageObjectKey = await uploadOrganizationImage(userId, logoFile)
			}

			const organization = await createOrganization({
				name,
				slug,
				description,
				userId,
				imageObjectKey,
			})

			// Store organization data in session for next steps
			return redirect(`/organizations/create?step=2&orgId=${organization.id}`)
		} catch (error) {
			console.error('Failed to create organization', error)
			return submission.reply({
				formErrors: ['Failed to create organization'],
			})
		}
	}

	// Handle step 2: Send invitations
	if (intent === 'send-invitations') {
		const orgId = formData.get('orgId') as string
		const submission = parseWithZod(formData, { schema: InviteSchema })

		if (submission.status !== 'success') {
			return Response.json({ result: submission.reply() }, { status: 400 })
		}

		const { invites } = submission.value

		if (invites && invites.length > 0) {
			try {
				const organization = await prisma.organization.findUnique({
					where: { id: orgId },
					select: { name: true, slug: true },
				})

				if (!organization) {
					throw new Error('Organization not found')
				}

				const currentUser = await prisma.user.findUnique({
					where: { id: userId },
					select: { name: true, email: true },
				})

				await Promise.all(
					invites.map(async (invite) => {
						const { invitation } = await createOrganizationInvitation({
							organizationId: orgId,
							email: invite.email,
							role: invite.role,
							inviterId: userId,
						})

						await sendOrganizationInvitationEmail({
							invitation,
							organizationName: organization.name,
							inviterName: currentUser?.name || currentUser?.email || 'Someone',
						})
					}),
				)
			} catch (error) {
				console.error('Error sending invitations:', error)
				return Response.json(
					{
						result: submission.reply({
							formErrors: ['An error occurred while sending the invitations.'],
						}),
					},
					{ status: 500 },
				)
			}
		}

		return redirect(`/organizations/create?step=3&orgId=${orgId}`)
	}

	// Handle step 3: Complete setup
	if (intent === 'complete-setup') {
		const orgId = formData.get('orgId') as string
		const submission = parseWithZod(formData, { schema: Step3Schema })

		if (submission.status !== 'success') {
			return submission.reply()
		}

		const { organizationSize, userDepartment } = submission.value

		try {
			// Update organization with size and user organization with department
			await prisma.$transaction([
				prisma.organization.update({
					where: { id: orgId },
					data: { size: organizationSize },
				}),
				prisma.userOrganization.update({
					where: {
						userId_organizationId: {
							userId,
							organizationId: orgId,
						},
					},
					data: { department: userDepartment },
				}),
			])

			const organization = await prisma.organization.findUnique({
				where: { id: orgId },
				select: { slug: true },
			})

			return redirect(`/app/${organization?.slug}`)
		} catch (error) {
			console.error('Failed to complete setup', error)
			return submission.reply({
				formErrors: ['Failed to complete setup'],
			})
		}
	}

	return Response.json({ error: 'Invalid intent' }, { status: 400 })
}

export default function CreateOrganizationPage() {
	const actionData = useActionData<typeof action>()
	const [searchParams] = useSearchParams()
	const currentStep = parseInt(searchParams.get('step') || '1')
	const orgId = searchParams.get('orgId')

	// Step progress indicator
	const steps = [
		{
			number: 1,
			title: 'Organization Details',
			description: 'Basic information',
		},
		{ number: 2, title: 'Invite Members', description: 'Add team members' },
		{ number: 3, title: 'Additional Info', description: 'Complete setup' },
	]

	return (
		<div className="max-w-2xl px-4 py-8 md:container">
			{/* Progress indicator */}
			<div className="mb-8 text-center">
				<div className="mb-2 flex items-center justify-center gap-2">
					{steps.map((step) => (
						<div
							key={step.number}
							className={`h-2 w-2 rounded-full ${
								currentStep >= step.number
									? 'bg-primary'
									: 'bg-muted-foreground'
							}`}
						/>
					))}
				</div>
				<p className="text-muted-foreground text-sm">
					Step {currentStep} of {steps.length}
				</p>
			</div>

			{/* Step content */}
			{currentStep === 1 && <Step1 actionData={actionData} />}
			{currentStep === 2 && orgId && (
				<Step2 orgId={orgId} actionData={actionData} />
			)}
			{currentStep === 3 && orgId && (
				<Step3 orgId={orgId} actionData={actionData} />
			)}
		</div>
	)
}

function Step1({ actionData }: { actionData: any }) {
	const [previewImage, setPreviewImage] = useState<string | null>(null)
	const [isSlugFocused, setIsSlugFocused] = useState(false)
	const [hasManuallyEditedSlug, setHasManuallyEditedSlug] = useState(false)

	const [form, fields] = useForm({
		id: 'create-organization-step1',
		constraint: getZodConstraint(Step1Schema),
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: Step1Schema })
		},
	})

	// Use input controls for name and slug to enable automatic slug generation
	const nameControl = useInputControl(fields.name)
	const slugControl = useInputControl(fields.slug)

	// Auto-generate slug from name when name changes (but not when user is editing slug or has manually edited it)
	useEffect(() => {
		if (nameControl.value && !isSlugFocused && !hasManuallyEditedSlug) {
			const generatedSlug = slugify(nameControl.value, {
				lowercase: true,
			})
			slugControl.change(generatedSlug)
		}
	}, [nameControl.value, isSlugFocused, hasManuallyEditedSlug, slugControl])

	const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.currentTarget.files?.[0]
		if (file) {
			const reader = new FileReader()
			reader.onload = (ev) => setPreviewImage(ev.target?.result as string)
			reader.readAsDataURL(file)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create a new organization</CardTitle>

				<CardDescription>
					An organization is a workspace where teams collect, organize, and work
					together.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<FormProvider context={form.context}>
					<form
						method="post"
						className="space-y-6"
						encType="multipart/form-data"
						{...getFormProps(form)}
					>
						<input type="hidden" name="intent" value="create-organization" />
						<input type="hidden" name="step" value="1" />

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
									id={fields.name.id}
									name={fields.name.name}
									value={nameControl.value ?? ''}
									onChange={(e) => nameControl.change(e.target.value)}
									onBlur={nameControl.blur}
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
										id={fields.slug.id}
										name={fields.slug.name}
										value={slugControl.value ?? ''}
										onChange={(e) => {
											// Normalize the slug as the user types
											const normalizedSlug = slugify(e.target.value, {
												lowercase: true,
											})
											slugControl.change(normalizedSlug)
											// Mark as manually edited
											setHasManuallyEditedSlug(true)
										}}
										onFocus={() => setIsSlugFocused(true)}
										onBlur={() => {
											setIsSlugFocused(false)
											slugControl.blur()
										}}
										placeholder="acme"
										className="flex-1"
									/>
								</div>
								<div className="mt-1 space-y-1">
									<div className="flex items-center justify-between">
										<p className="text-xs text-gray-500"></p>
										{hasManuallyEditedSlug && nameControl.value && (
											<button
												type="button"
												onClick={() => {
													const generatedSlug = slugify(nameControl.value, {
														lowercase: true,
													})
													slugControl.change(generatedSlug)
													setHasManuallyEditedSlug(false)
												}}
												className="text-xs text-blue-600 underline hover:text-blue-800"
											>
												Reset to auto-generated
											</button>
										)}
									</div>
								</div>
								<ErrorList errors={fields.slug.errors} id={fields.slug.id} />
							</div>

							<div>
								<Label htmlFor={fields.description.id}>Description</Label>
								<Textarea
									{...getInputProps(fields.description, { type: 'text' })}
									className="mt-1"
									rows={3}
									placeholder="Tell us about your organization..."
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
								<Link to="/app/organizations">Cancel</Link>
							</Button>
							<Button type="submit">Continue</Button>
						</div>
					</form>
				</FormProvider>
			</CardContent>
		</Card>
	)
}

function Step2({ orgId, actionData }: { orgId: string; actionData: any }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Invite team members</CardTitle>
				<CardDescription>
					Add your team members to get started. You can always invite more
					people later.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<div className="space-y-6">
					<CreateOrganizationInvitations
						orgId={orgId}
						actionData={actionData}
					/>

					<div className="flex justify-between pt-4">
						<div></div>
						<form method="post">
							<input type="hidden" name="intent" value="send-invitations" />
							<input type="hidden" name="orgId" value={orgId} />
							<Button type="submit" variant="outline">
								Skip for now
							</Button>
						</form>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function Step3({ orgId, actionData }: { orgId: string; actionData: any }) {
	const [form, fields] = useForm({
		id: 'create-organization-step3',
		constraint: getZodConstraint(Step3Schema),
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: Step3Schema })
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tell us more about your organization</CardTitle>
				<CardDescription>
					This helps us customize your experience and provide better insights.
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form method="post" className="space-y-6" {...getFormProps(form)}>
					<input type="hidden" name="intent" value="complete-setup" />
					<input type="hidden" name="orgId" value={orgId} />

					<div className="space-y-5">
						<div>
							<Label htmlFor={fields.organizationSize.id}>
								Organization size
							</Label>
							<Select
								name={fields.organizationSize.name}
								defaultValue={fields.organizationSize.initialValue}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Select organization size" />
								</SelectTrigger>
								<SelectContent>
									{organizationSizes.map((size) => (
										<SelectItem key={size.value} value={size.value}>
											{size.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<ErrorList
								errors={fields.organizationSize.errors}
								id={fields.organizationSize.id}
							/>
						</div>

						<div>
							<Label htmlFor={fields.userDepartment.id}>Your department</Label>
							<Select
								name={fields.userDepartment.name}
								defaultValue={fields.userDepartment.initialValue}
							>
								<SelectTrigger className="mt-1">
									<SelectValue placeholder="Select your department" />
								</SelectTrigger>
								<SelectContent>
									{departments.map((dept) => (
										<SelectItem key={dept.value} value={dept.value}>
											{dept.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<ErrorList
								errors={fields.userDepartment.errors}
								id={fields.userDepartment.id}
							/>
						</div>
					</div>

					<ErrorList errors={form.errors} id={form.errorId} />

					<div className="flex justify-between pt-4">
						<div></div>
						<Button type="submit">Complete Setup</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}

function CreateOrganizationInvitations({
	orgId,
	actionData,
}: {
	orgId: string
	actionData: any
}) {
	const [form, fields] = useForm({
		id: 'invite-form',
		constraint: getZodConstraint(InviteSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: InviteSchema })
		},
		defaultValue: {
			invites: [{ email: '', role: 'member' }],
		},
		shouldRevalidate: 'onBlur',
	})

	const invitesList = fields.invites.getFieldList()

	return (
		<div className="space-y-6">
			<FormProvider context={form.context}>
				<form method="POST" {...getFormProps(form)}>
					<input type="hidden" name="intent" value="send-invitations" />
					<input type="hidden" name="orgId" value={orgId} />

					<div className="space-y-3">
						{invitesList.map((invite, index) => (
							<CreateInviteFieldset
								key={invite.key}
								meta={invite}
								fields={fields}
								form={form}
								index={index}
							/>
						))}

						<Button
							variant="outline"
							className="w-full"
							{...form.insert.getButtonProps({
								name: fields.invites.name,
								defaultValue: { email: '', role: 'member' },
							})}
						>
							<svg
								className="h-4 w-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 6v6m0 0v6m0-6h6m-6 0H6"
								/>
							</svg>
							Add another invitation
						</Button>
					</div>

					<div className="mt-6 space-y-2">
						<ErrorList id={form.errorId} errors={form.errors} />
						<Button type="submit" className="w-full">
							Send Invitations
						</Button>
					</div>
				</form>
			</FormProvider>
		</div>
	)
}

function CreateInviteFieldset({
	meta,
	fields,
	form,
	index,
}: {
	meta: any
	fields: any
	form: any
	index: number
}) {
	const inviteFields = meta.getFieldset()
	const role = useInputControl(inviteFields.role)

	return (
		<div>
			<fieldset className="w-full">
				<div className="flex w-full items-start space-x-2">
					<div className="flex-1">
						<Input
							{...getInputProps(inviteFields.email, { type: 'email' })}
							placeholder="Enter email address"
							className="w-full"
						/>
						<ErrorList
							errors={inviteFields.email.errors}
							id={inviteFields.email.id}
						/>
					</div>

					<div className="min-w-[120px]">
						<Select
							name={inviteFields.role.name}
							value={
								Array.isArray(role.value)
									? role.value[0]
									: role.value || 'member'
							}
							onValueChange={(value) => {
								role.change(value)
							}}
							onOpenChange={(open) => {
								if (!open) {
									role.blur()
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="admin">
									<div className="flex flex-col">
										<span className="font-medium">Admin</span>
									</div>
								</SelectItem>
								<SelectItem value="member">
									<div className="flex flex-col">
										<span className="font-medium">Member</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						<ErrorList
							errors={inviteFields.role.errors}
							id={inviteFields.role.id}
						/>
					</div>

					{index > 0 && (
						<Button
							variant="ghost"
							size="icon"
							{...form.remove.getButtonProps({
								name: fields.invites.name,
								index,
							})}
						>
							<Icon name="trash" className="size-4" />
						</Button>
					)}
				</div>
				<ErrorList id={meta.errorId} errors={meta.errors} />
			</fieldset>
		</div>
	)
}
