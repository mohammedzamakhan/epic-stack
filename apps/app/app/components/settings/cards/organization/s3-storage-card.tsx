import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
	Label,
	Switch as ShadcnSwitch,
	Icon,
	StatusButton,
} from '@repo/ui'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useRef } from 'react'
import { useFetcher } from 'react-router'
import { z } from 'zod'
import { Field, ErrorList } from '#app/components/forms'

export const S3StorageSchema = z
	.object({
		s3Enabled: z.boolean().default(false),
		s3Endpoint: z.string().url().optional().or(z.literal('')),
		s3BucketName: z
			.string()
			.min(1, 'Bucket name is required')
			.optional()
			.or(z.literal('')),
		s3AccessKeyId: z
			.string()
			.min(1, 'Access Key ID is required')
			.optional()
			.or(z.literal('')),
		s3SecretAccessKey: z.string().optional().or(z.literal('')), // Made optional for updates
		s3Region: z
			.string()
			.min(1, 'Region is required')
			.optional()
			.or(z.literal('')),
	})
	.refine(
		(data) => {
			if (data.s3Enabled) {
				return (
					data.s3Endpoint &&
					data.s3BucketName &&
					data.s3AccessKeyId &&
					data.s3Region
				)
			}
			return true
		},
		{
			message:
				'S3 endpoint, bucket name, access key ID, and region are required when S3 storage is enabled',
			path: ['s3Enabled'],
		},
	)

export const s3StorageActionIntent = 'update-s3-storage'

interface Organization {
	id: string
	s3Config?: {
		id: string
		isEnabled: boolean
		endpoint: string
		bucketName: string
		accessKeyId: string
		secretAccessKey: string
		region: string
	} | null
}

type SwitchProps = {
	formId: string
	id?: string
	name: string
	value?: string
	defaultChecked?: boolean
	['aria-describedby']?: string
}

function Switch({
	name,
	formId,
	value,
	defaultChecked,
	...props
}: SwitchProps) {
	const switchRef = useRef<React.ElementRef<typeof ShadcnSwitch>>(null)
	const control = useInputControl({
		formId,
		key: props.id,
		name,
		initialValue: value,
	})

	return (
		<>
			{/* <input name={name} id={props.id} hidden /> */}
			<ShadcnSwitch
				{...props}
				ref={switchRef}
				name={name}
				checked={control.value === 'on' ? true : false}
				onCheckedChange={(checked) => control.change(checked ? 'on' : 'off')}
				onBlur={() => control.blur()}
			/>
		</>
	)
}

export function S3StorageCard({
	organization,
	actionData,
}: {
	organization: Organization
	actionData?: any
}) {
	const fetcher = useFetcher()

	const [form, fields] = useForm({
		id: 's3-storage-form',
		constraint: getZodConstraint(S3StorageSchema),
		lastResult: actionData?.result || fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: S3StorageSchema })
		},
		defaultValue: {
			s3Enabled: organization.s3Config?.isEnabled || 'on',
			s3Endpoint: organization.s3Config?.endpoint || '',
			s3BucketName: organization.s3Config?.bucketName || '',
			s3AccessKeyId: organization.s3Config?.accessKeyId || '',
			s3SecretAccessKey: '', // Always empty for security - require re-entry
			s3Region: organization.s3Config?.region || '',
		},
	})

	const testConnectionFetcher = useFetcher()

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon name="database" className="h-5 w-5" />
					S3 Storage Configuration
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-4">
					<fetcher.Form
						method="POST"
						{...getFormProps(form)}
						className="space-y-4"
					>
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label className="flex items-center gap-2">
									<Switch
										formId={form.id}
										id={fields.s3Enabled.id}
										name={fields.s3Enabled.name}
										defaultChecked={organization.s3Config?.isEnabled}
									/>
									Enable Custom S3 Storage
								</Label>
								<p className="text-muted-foreground text-sm">
									Use your own S3-compatible storage instead of the default
									storage
								</p>
							</div>
						</div>

						{(fields.s3Enabled.value === 'on' ||
							organization.s3Config?.isEnabled) && (
							<div className="space-y-4 border-t pt-4">
								<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
									<div className="flex items-start gap-2">
										<Icon
											name="alert-triangle"
											className="mt-0.5 h-5 w-5 text-yellow-600"
										/>
										<div className="text-sm">
											<p className="font-medium text-yellow-800">
												Important Security Note
											</p>
											<p className="mt-1 text-yellow-700">
												Your S3 credentials will be encrypted and stored
												securely. However, we recommend using IAM credentials
												with minimal required permissions (read/write access to
												the specific bucket only).
											</p>
										</div>
									</div>
								</div>

								<input
									type="hidden"
									name="intent"
									value={s3StorageActionIntent}
								/>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Field
										labelProps={{
											htmlFor: fields.s3Endpoint.id,
											children: 'S3 Endpoint URL',
										}}
										inputProps={{
											...getInputProps(fields.s3Endpoint, { type: 'url' }),
											placeholder: 'https://s3.amazonaws.com',
										}}
										errors={fields.s3Endpoint.errors}
									/>
									<Field
										labelProps={{
											htmlFor: fields.s3Region.id,
											children: 'Region',
										}}
										inputProps={{
											...getInputProps(fields.s3Region, { type: 'text' }),
											placeholder: 'us-east-1',
										}}
										errors={fields.s3Region.errors}
									/>
								</div>

								<Field
									labelProps={{
										htmlFor: fields.s3BucketName.id,
										children: 'Bucket Name',
									}}
									inputProps={{
										...getInputProps(fields.s3BucketName, { type: 'text' }),
										placeholder: 'my-organization-bucket',
									}}
									errors={fields.s3BucketName.errors}
								/>

								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<Field
										labelProps={{
											htmlFor: fields.s3AccessKeyId.id,
											children: 'Access Key ID',
										}}
										inputProps={{
											...getInputProps(fields.s3AccessKeyId, { type: 'text' }),
											placeholder: 'AKIAIOSFODNN7EXAMPLE',
										}}
										errors={fields.s3AccessKeyId.errors}
									/>
									<Field
										labelProps={{
											htmlFor: fields.s3SecretAccessKey.id,
											children: 'Secret Access Key',
										}}
										inputProps={{
											...getInputProps(fields.s3SecretAccessKey, {
												type: 'password',
											}),
											placeholder: organization.s3Config?.secretAccessKey
												? '••••••••••••••••••••••••••••••••••••••••••'
												: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
										}}
										errors={fields.s3SecretAccessKey.errors}
									/>
									{organization.s3Config?.secretAccessKey && (
										<p className="text-muted-foreground mt-1 text-sm">
											Leave empty to keep existing secret key, or enter a new
											one to update.
										</p>
									)}
								</div>

								<ErrorList id={form.errorId} errors={form.errors} />
							</div>
						)}
					</fetcher.Form>
				</div>
			</CardContent>
			<CardFooter className="justify-end">
				<StatusButton
					size="sm"
					form={form.id}
					type="submit"
					variant="default"
					name="intent"
					value={s3StorageActionIntent}
					status={
						fetcher.state !== 'idle' ? 'pending' : (form.status ?? 'idle')
					}
				>
					Save
				</StatusButton>
				{fields.s3Endpoint.value &&
					fields.s3BucketName.value &&
					fields.s3AccessKeyId.value &&
					fields.s3SecretAccessKey.value &&
					fields.s3Region.value && (
						<div className="border-t pt-4">
							<testConnectionFetcher.Form
								method="POST"
								className="flex items-center gap-2"
							>
								<input type="hidden" name="intent" value="test-s3-connection" />
								<input
									type="hidden"
									name="s3Endpoint"
									value={fields.s3Endpoint.value}
								/>
								<input
									type="hidden"
									name="s3BucketName"
									value={fields.s3BucketName.value}
								/>
								<input
									type="hidden"
									name="s3AccessKeyId"
									value={fields.s3AccessKeyId.value}
								/>
								<input
									type="hidden"
									name="s3SecretAccessKey"
									value={fields.s3SecretAccessKey.value}
								/>
								<input
									type="hidden"
									name="s3Region"
									value={fields.s3Region.value}
								/>

								<StatusButton
									type="submit"
									variant="outline"
									size="sm"
									status={
										testConnectionFetcher.state !== 'idle' ? 'pending' : 'idle'
									}
								>
									<Icon name="link-2" className="mr-1 h-4 w-4" />
									Test Connection
								</StatusButton>
							</testConnectionFetcher.Form>

							{testConnectionFetcher.data?.connectionTest && (
								<div
									className={`mt-2 rounded-lg border p-3 ${
										testConnectionFetcher.data.connectionTest.success
											? 'border-green-200 bg-green-50'
											: 'border-red-200 bg-red-50'
									}`}
								>
									<div className="flex items-center gap-2">
										<Icon
											name={
												testConnectionFetcher.data.connectionTest.success
													? 'check'
													: 'x'
											}
											className={`h-4 w-4 ${
												testConnectionFetcher.data.connectionTest.success
													? 'text-green-600'
													: 'text-red-600'
											}`}
										/>
										<p
											className={`text-sm font-medium ${
												testConnectionFetcher.data.connectionTest.success
													? 'text-green-800'
													: 'text-red-800'
											}`}
										>
											{testConnectionFetcher.data.connectionTest.success
												? 'Connection successful!'
												: 'Connection failed'}
										</p>
									</div>
									{testConnectionFetcher.data.connectionTest.message && (
										<p
											className={`mt-1 text-sm ${
												testConnectionFetcher.data.connectionTest.success
													? 'text-green-700'
													: 'text-red-700'
											}`}
										>
											{testConnectionFetcher.data.connectionTest.message}
										</p>
									)}
								</div>
							)}
						</div>
					)}
			</CardFooter>
		</Card>
	)
}
