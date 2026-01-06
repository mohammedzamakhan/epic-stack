import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
	FormProvider,
} from '@conform-to/react'

import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Trans } from '@lingui/macro'
import { prisma } from '@repo/database'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Field, FieldLabel, FieldError, FieldGroup } from '@repo/ui/field'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@repo/ui/select'
import { Textarea } from '@repo/ui/textarea'
import slugify from '@sindresorhus/slugify'
import { useState, useEffect } from 'react'
import {
	redirect,
	type ActionFunctionArgs,
	Link,
	useActionData,
	useLoaderData,
	useSearchParams,
} from 'react-router'
import { z } from 'zod'
import {
	ErrorList,
	convertErrorsToFieldFormat,
} from '#app/components/forms.tsx'

import { requireUserId } from '#app/utils/auth.server.ts'
import { getLaunchStatus } from '#app/utils/env.server.ts'
import {
	createOrganizationInvitation,
	sendOrganizationInvitationEmail,
} from '#app/utils/organization/invitation.server.ts'
import { createOrganization } from '#app/utils/organization/organizations.server.ts'
import {
	getTrialConfig,
	getPlansAndPrices,
	createCheckoutSession,
} from '#app/utils/payments.server.ts'
import { uploadOrganizationImage } from '#app/utils/storage.server.ts'
import { shouldBeOnWaitlist } from '#app/utils/waitlist.server.ts'

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
// Using default roles for organization creation since we don't have a loader
const DEFAULT_AVAILABLE_ROLES = ['admin', 'member', 'viewer', 'guest'] as const

// Create role descriptions map (currently unused but kept for future use)
// const ROLE_DESCRIPTIONS: Record<string, string> = {
// 	admin: 'Full access to organization settings and member management.',
// 	member: 'Standard organization member with basic permissions.',
// 	viewer: 'Read-only access to organization content.',
// 	guest: 'Limited access for temporary collaborators.',
// }

const InviteSchema = z.object({
	invites: z
		.array(
			z.object({
				email: z.string().email('Invalid email address'),
				role: z.enum(DEFAULT_AVAILABLE_ROLES),
			}),
		)
		.optional(),
})

// Step 3: Subscription (only for stripe mode)
const SubscriptionSchema = z.object({
	priceId: z.string().min(1, { message: 'Please select a plan' }),
})

// Step 4: Additional info (previously step 3)
const Step4Schema = z.object({
	organizationSize: z
		.string()
		.min(1, { message: 'Organization size is required' }),
	userDepartment: z.string().min(1, { message: 'Department is required' }),
})

export async function loader({ request }: { request: Request }) {
	const userId = await requireUserId(request)

	// Check if user should be on waitlist
	const onWaitlist = await shouldBeOnWaitlist(userId)
	if (onWaitlist) {
		throw redirect('/waitlist')
	}

	const trialConfig = getTrialConfig()
	const launchStatus = getLaunchStatus()
	let plansAndPrices = null

	// Only fetch plans if we need Stripe subscription and not in PUBLIC_BETA or CLOSED_BETA
	const shouldShowPricing =
		trialConfig.creditCardRequired === 'stripe' &&
		launchStatus !== 'PUBLIC_BETA' &&
		launchStatus !== 'CLOSED_BETA'

	if (shouldShowPricing) {
		try {
			plansAndPrices = await getPlansAndPrices()
		} catch (error) {
			console.error('Failed to fetch plans and prices:', error)
		}
	}

	return {
		trialConfig,
		plansAndPrices,
		launchStatus,
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	// Check if user should be on waitlist
	const onWaitlist = await shouldBeOnWaitlist(userId)
	if (onWaitlist) {
		throw redirect('/waitlist')
	}

	const formData = await request.formData()
	const intent = formData.get('intent') as string
	const trialConfig = getTrialConfig()
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

			// Determine next step based on trial configuration and launch status
			const launchStatus = getLaunchStatus()
			const shouldShowPricing =
				trialConfig.creditCardRequired === 'stripe' &&
				launchStatus !== 'PUBLIC_BETA' &&
				launchStatus !== 'CLOSED_BETA'

			const nextStep = shouldShowPricing ? 2 : 3
			return redirect(
				`/organizations/create?step=${nextStep}&orgId=${organization.id}`,
			)
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

		// Determine next step based on trial configuration
		const nextStep = trialConfig.creditCardRequired === 'stripe' ? 4 : 3
		return redirect(`/organizations/create?step=${nextStep}&orgId=${orgId}`)
	}

	// Handle step 3: Subscription (only for stripe mode)
	if (intent === 'subscribe') {
		// CRITICAL: Validate launch status to prevent unauthorized subscription creation
		const launchStatus = getLaunchStatus()
		if (launchStatus === 'PUBLIC_BETA' || launchStatus === 'CLOSED_BETA') {
			throw new Response('Subscriptions are not available during beta', {
				status: 403,
			})
		}

		const orgId = formData.get('orgId') as string
		const submission = parseWithZod(formData, { schema: SubscriptionSchema })

		if (submission.status !== 'success') {
			return submission.reply()
		}

		const { priceId } = submission.value

		try {
			const organization = await prisma.organization.findUnique({
				where: { id: orgId },
			})

			if (!organization) {
				throw new Error('Organization not found')
			}

			// Create Stripe checkout session
			return await createCheckoutSession(request, {
				organization,
				priceId,
				from: 'checkout',
				isCreationFlow: true,
			})
		} catch (error) {
			console.error('Failed to create checkout session', error)
			return submission.reply({
				formErrors: ['Failed to create subscription'],
			})
		}
	}

	// Handle step 4: Complete setup (previously step 3)
	if (intent === 'complete-setup') {
		const orgId = formData.get('orgId') as string
		const submission = parseWithZod(formData, { schema: Step4Schema })

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

			return redirect(`/${organization?.slug}?celebrate=true`)
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
	const { trialConfig, plansAndPrices } = useLoaderData<typeof loader>()
	const [searchParams] = useSearchParams()
	const rawStep = parseInt(searchParams.get('step') || '1')
	// Validate step to prevent logic bypass
	const currentStep = Math.max(1, Math.min(rawStep, 5))
	const orgId = searchParams.get('orgId')

	// Dynamic step configuration based on trial mode
	const steps =
		trialConfig.creditCardRequired === 'stripe'
			? [
					{
						number: 1,
						title: 'Organization Details',
						description: 'Basic information',
					},
					{
						number: 2,
						title: 'Choose Plan',
						description: 'Select subscription',
					},
					{
						number: 3,
						title: 'Invite Members',
						description: 'Add team members',
					},
					{
						number: 4,
						title: 'Additional Info',
						description: 'Complete setup',
					},
				]
			: [
					{
						number: 1,
						title: 'Organization Details',
						description: 'Basic information',
					},
					{
						number: 2,
						title: 'Invite Members',
						description: 'Add team members',
					},
					{
						number: 3,
						title: 'Additional Info',
						description: 'Complete setup',
					},
				]

	return (
		<div className="container mx-auto max-w-xl px-4 py-8">
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
					<Trans>
						Step {currentStep} of {steps.length}
					</Trans>
				</p>
			</div>

			{/* Step content */}
			{currentStep === 1 && <Step1 actionData={actionData} />}
			{trialConfig.creditCardRequired === 'stripe' ? (
				<>
					{currentStep === 2 && orgId && plansAndPrices && (
						<SubscriptionStep
							orgId={orgId}
							plansAndPrices={plansAndPrices}
							actionData={actionData}
						/>
					)}
					{currentStep === 3 && orgId && (
						<Step3 orgId={orgId} actionData={actionData} />
					)}
					{currentStep === 4 && orgId && (
						<Step4 orgId={orgId} actionData={actionData} />
					)}
				</>
			) : (
				<>
					{currentStep === 2 && orgId && (
						<Step3 orgId={orgId} actionData={actionData} />
					)}
					{currentStep === 3 && orgId && (
						<Step4 orgId={orgId} actionData={actionData} />
					)}
				</>
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
			const generatedSlug = slugify(nameControl.value ?? '', {
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
				<CardTitle>
					<h2>
						<Trans>Create a new organization</Trans>
					</h2>
				</CardTitle>

				<CardDescription>
					<Trans>
						An organization is a workspace where teams collect, organize, and
						work together.
					</Trans>
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

						<FieldGroup>
							<Field
								data-invalid={fields.logoFile.errors?.length ? true : undefined}
							>
								<FieldLabel htmlFor={fields.logoFile.id}>
									<Trans>Logo</Trans>
								</FieldLabel>
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
												aria-invalid={
													fields.logoFile.errors?.length ? true : undefined
												}
											/>
											<Button type="button" variant="outline" size="sm">
												<label
													htmlFor={fields.logoFile.id}
													className="cursor-pointer"
												>
													<Trans>Upload your logo</Trans>
												</label>
											</Button>
											<p className="mt-1 text-xs text-gray-500">
												<Trans>*.png, *.jpeg files up to 5 MB</Trans>
											</p>
										</div>
									</div>
								</div>
								<FieldError
									errors={convertErrorsToFieldFormat(fields.logoFile.errors)}
								/>
							</Field>

							<Field
								data-invalid={fields.name.errors?.length ? true : undefined}
							>
								<FieldLabel htmlFor={fields.name.id}>
									<Trans>Name</Trans>
									<span className="text-red-500">*</span>
								</FieldLabel>
								<Input
									id={fields.name.id}
									name={fields.name.name}
									value={nameControl.value ?? ''}
									onChange={(e) => nameControl.change(e.target.value)}
									onBlur={nameControl.blur}
									placeholder="Acme Inc."
									aria-invalid={fields.name.errors?.length ? true : undefined}
								/>
								<FieldError
									errors={convertErrorsToFieldFormat(fields.name.errors)}
								/>
							</Field>

							<Field
								data-invalid={fields.slug.errors?.length ? true : undefined}
							>
								<FieldLabel htmlFor={fields.slug.id}>
									<Trans>Slug</Trans>
									<span className="text-red-500">*</span>
								</FieldLabel>
								<div className="flex items-center">
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
										aria-invalid={fields.slug.errors?.length ? true : undefined}
									/>
								</div>
								<div className="mt-1 space-y-1">
									<div className="flex items-center justify-between">
										<p className="text-xs text-gray-500"></p>
										{hasManuallyEditedSlug && nameControl.value && (
											<button
												type="button"
												onClick={() => {
													const generatedSlug = slugify(
														nameControl.value || '',
														{
															lowercase: true,
														},
													)
													slugControl.change(generatedSlug)
													setHasManuallyEditedSlug(false)
												}}
												className="text-xs text-blue-600 underline hover:text-blue-800"
											>
												<Trans>Reset to auto-generated</Trans>
											</button>
										)}
									</div>
								</div>
								<FieldError
									errors={convertErrorsToFieldFormat(fields.slug.errors)}
								/>
							</Field>

							<Field
								data-invalid={
									fields.description.errors?.length ? true : undefined
								}
							>
								<FieldLabel htmlFor={fields.description.id}>
									<Trans>Description</Trans>
								</FieldLabel>
								<Textarea
									{...getInputProps(fields.description, { type: 'text' })}
									rows={3}
									placeholder="Tell us about your organization..."
									aria-invalid={
										fields.description.errors?.length ? true : undefined
									}
								/>
								<FieldError
									errors={convertErrorsToFieldFormat(fields.description.errors)}
								/>
							</Field>
						</FieldGroup>

						<ErrorList errors={form.errors} id={form.errorId} />

						<div className="flex justify-end gap-4 pt-4">
							<Button variant="outline">
								<Link to="/organizations">
									<Trans>Cancel</Trans>
								</Link>
							</Button>
							<Button type="submit">
								<Trans>Continue</Trans>
							</Button>
						</div>
					</form>
				</FormProvider>
			</CardContent>
		</Card>
	)
}

function SubscriptionStep({
	orgId,
	plansAndPrices,
	actionData,
}: {
	orgId: string
	plansAndPrices: Awaited<ReturnType<typeof getPlansAndPrices>>
	actionData: any
}) {
	const [form, ignored_fields] = useForm({
		id: 'create-organization-subscription',
		constraint: getZodConstraint(SubscriptionSchema),
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SubscriptionSchema })
		},
	})

	const [selectedPriceId, setSelectedPriceId] = useState<string>('')
	const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>(
		'monthly',
	)

	const PLANS = {
		Base: {
			name: 'Base plan',
			seats: 3,
		},
		Plus: {
			name: 'Plus plan',
			seats: 5,
		},
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Trans>Choose your plan</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Select a subscription plan to get started with your organization.
						Your trial will begin after payment setup.
					</Trans>
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form method="post" className="space-y-6" {...getFormProps(form)}>
					<input type="hidden" name="intent" value="subscribe" />
					<input type="hidden" name="orgId" value={orgId} />
					<input type="hidden" name="priceId" value={selectedPriceId} />

					{/* Billing Interval Toggle */}
					<div className="flex items-center justify-center">
						<div className="bg-muted flex items-center space-x-2 rounded-lg p-1">
							<button
								type="button"
								onClick={() => {
									setBillingInterval('monthly')
									setSelectedPriceId('') // Reset selection when switching intervals
								}}
								className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
									billingInterval === 'monthly'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Trans>Monthly</Trans>
							</button>
							<button
								type="button"
								onClick={() => {
									setBillingInterval('yearly')
									setSelectedPriceId('') // Reset selection when switching intervals
								}}
								className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
									billingInterval === 'yearly'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<Trans>Yearly</Trans>
								<Badge variant="secondary" className="ml-2 text-xs">
									<Trans>Save 20%</Trans>
								</Badge>
							</button>
						</div>
					</div>

					<div className="grid gap-6 lg:grid-cols-2">
						{/* Base Plan */}
						<PlanCard
							plan="base"
							title={PLANS.Base.name}
							seats={PLANS.Base.seats}
							stripePrice={plansAndPrices?.prices.base?.[billingInterval]}
							billingInterval={billingInterval}
							selectedPriceId={selectedPriceId}
							onSelect={setSelectedPriceId}
						/>

						{/* Plus Plan */}
						<PlanCard
							plan="plus"
							title={PLANS.Plus.name}
							seats={PLANS.Plus.seats}
							stripePrice={plansAndPrices?.prices.plus?.[billingInterval]}
							billingInterval={billingInterval}
							selectedPriceId={selectedPriceId}
							onSelect={setSelectedPriceId}
							isPremium
						/>
					</div>

					<ErrorList errors={form.errors} id={form.errorId} />

					<div className="flex justify-between pt-4">
						<Button variant="outline">
							<Link to="/organizations">
								<Trans>Cancel</Trans>
							</Link>
						</Button>
						<Button type="submit" disabled={!selectedPriceId}>
							<Trans>Continue to Payment</Trans>
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	)
}

function Step3({ orgId, actionData }: { orgId: string; actionData: any }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Trans>Invite team members</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						Add your team members to get started. You can always invite more
						people later.
					</Trans>
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
								<Trans>Skip for now</Trans>
							</Button>
						</form>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function Step4({ orgId, actionData }: { orgId: string; actionData: any }) {
	const [form, fields] = useForm({
		id: 'create-organization-step4',
		constraint: getZodConstraint(Step4Schema),
		lastResult: actionData,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: Step4Schema })
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					<Trans>Tell us more about your organization</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>
						This helps us customize your experience and provide better insights.
					</Trans>
				</CardDescription>
			</CardHeader>

			<CardContent>
				<form method="post" className="space-y-6" {...getFormProps(form)}>
					<input type="hidden" name="intent" value="complete-setup" />
					<input type="hidden" name="orgId" value={orgId} />

					<FieldGroup>
						<Field
							data-invalid={
								fields.organizationSize.errors?.length ? true : undefined
							}
						>
							<FieldLabel htmlFor={fields.organizationSize.id}>
								<Trans>Organization size</Trans>
							</FieldLabel>
							<Select
								name={fields.organizationSize.name}
								defaultValue={fields.organizationSize.initialValue}
							>
								<SelectTrigger className="mt-1">
									Select organization size
								</SelectTrigger>
								<SelectContent>
									{organizationSizes.map((size) => (
										<SelectItem key={size.value} value={size.value}>
											{size.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError
								errors={convertErrorsToFieldFormat(
									fields.organizationSize.errors,
								)}
							/>
						</Field>

						<Field
							data-invalid={
								fields.userDepartment.errors?.length ? true : undefined
							}
						>
							<FieldLabel htmlFor={fields.userDepartment.id}>
								<Trans>Your department</Trans>
							</FieldLabel>
							<Select
								name={fields.userDepartment.name}
								defaultValue={fields.userDepartment.initialValue}
							>
								<SelectTrigger className="mt-1">
									Select your department
								</SelectTrigger>
								<SelectContent>
									{departments.map((dept) => (
										<SelectItem key={dept.value} value={dept.value}>
											{dept.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FieldError
								errors={convertErrorsToFieldFormat(
									fields.userDepartment.errors,
								)}
							/>
						</Field>
					</FieldGroup>

					<ErrorList errors={form.errors} id={form.errorId} />

					<div className="flex justify-between pt-4">
						<div></div>
						<Button type="submit">
							<Trans>Complete Setup</Trans>
						</Button>
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
							<Trans>Add another invitation</Trans>
						</Button>
					</div>

					<div className="mt-6 space-y-2">
						<ErrorList id={form.errorId} errors={form.errors} />
						<Button type="submit" className="w-full">
							<Trans>Send Invitations</Trans>
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
					<Field
						className="flex-1"
						data-invalid={inviteFields.email.errors?.length ? true : undefined}
					>
						<Input
							{...getInputProps(inviteFields.email, { type: 'email' })}
							placeholder="Enter email address"
							className="w-full"
							aria-invalid={
								inviteFields.email.errors?.length ? true : undefined
							}
						/>
						<FieldError
							errors={convertErrorsToFieldFormat(inviteFields.email.errors)}
						/>
					</Field>

					<Field
						className="max-w-[120px]"
						data-invalid={inviteFields.role.errors?.length ? true : undefined}
					>
						<Select
							name={inviteFields.role.name}
							value={
								Array.isArray(role.value)
									? role.value[0]
									: role.value || 'member'
							}
							onValueChange={(value) => {
								role.change(value as string)
							}}
							onOpenChange={(open) => {
								if (!open) {
									role.blur()
								}
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{DEFAULT_AVAILABLE_ROLES.map((role) => (
									<SelectItem key={role} value={role}>
										<div className="flex flex-col">
											<span className="font-medium">
												{role.charAt(0).toUpperCase() + role.slice(1)}
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldError
							errors={convertErrorsToFieldFormat(inviteFields.role.errors)}
						/>
					</Field>

					{index > 0 && (
						<Button
							variant="ghost"
							size="icon"
							{...form.remove.getButtonProps({
								name: fields.invites.name,
								index,
							})}
						>
							<Icon name="trash-2" className="size-4" />
						</Button>
					)}
				</div>
				<ErrorList id={meta.errorId} errors={meta.errors} />
			</fieldset>
		</div>
	)
}

function PlanCard({
	plan: _plan,
	title,
	seats,
	stripePrice,
	billingInterval,
	selectedPriceId,
	onSelect,
	isPremium = false,
}: {
	plan: 'base' | 'plus'
	title: string
	seats: number
	stripePrice?: {
		id: string
		productId: string
		unitAmount: number | null
		currency: string
		interval: string | null | undefined
		trialPeriodDays: number | null | undefined
		tiers?: Array<{
			flat_amount: number | null
			unit_amount: number | null
			up_to: number | null
		}>
	}
	billingInterval: 'monthly' | 'yearly'
	selectedPriceId: string
	onSelect: (priceId: string) => void
	isPremium?: boolean
}) {
	if (!stripePrice) {
		return (
			<div className="border-border rounded-lg border-2 p-4 opacity-50">
				<div className="text-muted-foreground text-center">
					<p>
						<Trans>Plan not available</Trans>
					</p>
					<p className="text-sm">
						<Trans>Please check configuration</Trans>
					</p>
				</div>
			</div>
		)
	}

	// Handle tiered pricing - get the base price from the first tier's flat_amount
	let basePrice = 0
	let additionalUserPrice = 0

	if (stripePrice.unitAmount) {
		// Standard pricing
		basePrice = stripePrice.unitAmount / 100
	} else if (stripePrice.tiers && stripePrice.tiers.length > 0) {
		// Tiered pricing - use the first tier's flat_amount
		const firstTier = stripePrice.tiers[0]
		const secondTier = stripePrice.tiers[1]

		if (firstTier?.flat_amount) {
			basePrice = firstTier.flat_amount / 100
		}

		// Get additional user pricing from second tier
		if (secondTier?.unit_amount) {
			additionalUserPrice = secondTier.unit_amount / 100
		}
	}

	if (basePrice === 0) {
		return (
			<div className="border-border rounded-lg border-2 p-4 opacity-50">
				<div className="text-muted-foreground text-center">
					<p>
						<Trans>Price not configured</Trans>
					</p>
					<p className="text-sm">
						<Trans>Contact support</Trans>
					</p>
				</div>
			</div>
		)
	}

	const displayPrice = billingInterval === 'yearly' ? basePrice / 12 : basePrice
	const isSelected = selectedPriceId === stripePrice.id

	return (
		<div
			className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
				isSelected
					? 'border-primary bg-primary/5'
					: 'border-border hover:border-primary/50'
			}`}
			onClick={() => onSelect(stripePrice.id)}
		>
			<div className="mb-4">
				<div className="flex items-baseline gap-2">
					<span className="text-2xl font-bold">${displayPrice.toFixed(2)}</span>
					<span className="text-muted-foreground text-sm">
						<Trans>per month</Trans>
					</span>
				</div>
				{billingInterval === 'yearly' && (
					<div className="text-muted-foreground text-sm">
						<Trans>${basePrice.toFixed(2)} billed annually</Trans>
					</div>
				)}
				<h3 className="text-lg font-semibold">{title}</h3>
			</div>
			<ul className="text-muted-foreground space-y-2 text-sm">
				<li>
					<Trans>Includes {seats} user seats</Trans>
				</li>
				{additionalUserPrice > 0 && (
					<li>
						<Trans>
							Additional users: $
							{billingInterval === 'yearly'
								? (additionalUserPrice / 12).toFixed(2)
								: additionalUserPrice.toFixed(2)}
							/user/month
							{billingInterval === 'yearly' && (
								<span className="block text-xs opacity-75">
									(${additionalUserPrice.toFixed(2)} billed annually per user)
								</span>
							)}
						</Trans>
					</li>
				)}
				<li>
					<Trans>All core features included</Trans>
				</li>
				{isPremium && (
					<li>
						<Trans>Priority support</Trans>
					</li>
				)}
			</ul>
		</div>
	)
}
