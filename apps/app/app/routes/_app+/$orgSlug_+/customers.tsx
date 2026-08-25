import { cn } from '@repo/ui'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@repo/ui/dialog'
import { Icon } from '@repo/ui/icon'
import { Input } from '@repo/ui/input'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from '@repo/ui/item'
import { Label } from '@repo/ui/label'
import { PageTitle } from '@repo/ui/page-title'
import { Skeleton } from '@repo/ui/skeleton'
import { useEffect, useState } from 'react'
import { useLoaderData, type LoaderFunctionArgs } from 'react-router'
import { EmptyState } from '#app/components/empty-state.tsx'
import { getOperatorTenantClient } from '#app/utils/tenant-api.server.ts'

const VERIFICATION_FILTERS = ['all', 'verified', 'unverified'] as const

type VerificationFilter = (typeof VERIFICATION_FILTERS)[number]

interface CustomerListItem {
	id: string
	name: string
	email: string | null
	phone: string | null
	phoneVerified: boolean | null
	createdAt: string
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const orgSlug = params.orgSlug || ''
	const { jwt, tenantApiUrl } = await getOperatorTenantClient(request, orgSlug)

	return { jwt, tenantApiUrl }
}

export default function CustomersRoute() {
	const { jwt, tenantApiUrl } = useLoaderData<typeof loader>()
	const [customers, setCustomers] = useState<CustomerListItem[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [verificationFilter, setVerificationFilter] =
		useState<VerificationFilter>('all')
	const [editingCustomer, setEditingCustomer] =
		useState<CustomerListItem | null>(null)
	const [editName, setEditName] = useState('')
	const [editEmail, setEditEmail] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)

	useEffect(() => {
		async function fetchCustomers() {
			try {
				const res = await fetch(`${tenantApiUrl}/operator/customers`, {
					headers: { Authorization: `Bearer ${jwt}` },
				})
				if (!res.ok) {
					throw new Error('Failed to load customers')
				}
				const data = (await res.json()) as { customers?: CustomerListItem[] }
				setCustomers(data.customers ?? [])
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to load customers',
				)
			} finally {
				setLoading(false)
			}
		}

		void fetchCustomers()
	}, [jwt, tenantApiUrl])

	const filteredCustomers = customers.filter((customer) => {
		const query = searchQuery.trim().toLowerCase()
		const matchesSearch =
			query.length === 0 ||
			customer.name.toLowerCase().includes(query) ||
			(customer.email?.toLowerCase().includes(query) ?? false) ||
			(customer.phone?.toLowerCase().includes(query) ?? false)

		const matchesVerification =
			verificationFilter === 'all' ||
			(verificationFilter === 'verified' && customer.phoneVerified === true) ||
			(verificationFilter === 'unverified' && !customer.phoneVerified)

		return matchesSearch && matchesVerification
	})

	const hasFilters = searchQuery.length > 0 || verificationFilter !== 'all'

	function openEditDialog(customer: CustomerListItem) {
		setEditingCustomer(customer)
		setEditName(customer.name)
		setEditEmail(customer.email ?? '')
		setSaveError(null)
	}

	async function handleSave(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (!editingCustomer || editName.trim() === '') return

		setIsSaving(true)
		setSaveError(null)

		try {
			const res = await fetch(
				`${tenantApiUrl}/operator/customers/${editingCustomer.id}`,
				{
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${jwt}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						name: editName.trim(),
						email: editEmail.trim(),
					}),
				},
			)

			if (!res.ok) {
				const data = (await res.json().catch(() => null)) as {
					error?: string
				} | null
				setSaveError(data?.error ?? 'Failed to update customer')
				return
			}

			const data = (await res.json()) as { customer: CustomerListItem }
			setCustomers((current) =>
				current.map((customer) =>
					customer.id === data.customer.id ? data.customer : customer,
				),
			)
			setEditingCustomer(null)
		} catch (err) {
			setSaveError(
				err instanceof Error ? err.message : 'Failed to update customer',
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<div className="py-8 md:p-8">
			<div className="mb-8">
				<PageTitle
					title="Customers"
					description="Search, filter, and update customer contact details."
				/>
			</div>

			<div className="space-y-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="relative max-w-sm flex-1">
						<Icon
							name="search"
							className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
						/>
						<Input
							placeholder="Search by name, email, or phone..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-9 pl-9"
							disabled={loading}
						/>
					</div>
					<div className="flex flex-wrap items-center gap-1">
						{VERIFICATION_FILTERS.map((filter) => (
							<button
								key={filter}
								type="button"
								onClick={() => setVerificationFilter(filter)}
								disabled={loading}
								className={cn(
									'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
									verificationFilter === filter
										? 'bg-muted text-foreground'
										: 'text-muted-foreground hover:text-foreground',
								)}
							>
								{filter}
							</button>
						))}
					</div>
				</div>

				{loading ? (
					<ItemGroup>
						{Array.from({ length: 5 }).map((_, index) => (
							<Skeleton key={index} className="h-16 w-full rounded-lg" />
						))}
					</ItemGroup>
				) : error ? (
					<p className="text-destructive text-sm">{error}</p>
				) : filteredCustomers.length === 0 ? (
					<EmptyState
						title="No customers found"
						description={
							hasFilters
								? 'Try adjusting your search or filter.'
								: 'Customers appear here after they sign up on your site.'
						}
						icons={['users', 'user', 'search']}
					/>
				) : (
					<ItemGroup>
						{filteredCustomers.map((customer) => (
							<Item key={customer.id} variant="outline" size="sm">
								<ItemContent>
									<ItemTitle>
										{customer.name}
										{customer.phoneVerified ? (
											<Badge variant="secondary" className="text-[10px]">
												Verified
											</Badge>
										) : null}
									</ItemTitle>
									<ItemDescription>
										{customer.phone || 'No phone'}
										{' · '}
										{customer.email || 'No email'}
										{' · '}
										Joined {new Date(customer.createdAt).toLocaleDateString()}
									</ItemDescription>
								</ItemContent>
								<ItemActions>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="gap-1.5"
										onClick={() => openEditDialog(customer)}
									>
										<Icon name="pencil" className="size-3.5" />
										Edit
									</Button>
								</ItemActions>
							</Item>
						))}
					</ItemGroup>
				)}

				<Dialog
					open={editingCustomer !== null}
					onOpenChange={(open) => {
						if (!open && !isSaving) {
							setEditingCustomer(null)
						}
					}}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Edit customer</DialogTitle>
							<DialogDescription>
								Update name and email. Phone number is managed through site
								sign-in.
							</DialogDescription>
						</DialogHeader>

						{editingCustomer ? (
							<form onSubmit={handleSave} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="customer-name">Name</Label>
									<Input
										id="customer-name"
										value={editName}
										onChange={(e) => setEditName(e.target.value)}
										required
										autoComplete="name"
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="customer-email">Email</Label>
									<Input
										id="customer-email"
										type="email"
										value={editEmail}
										onChange={(e) => setEditEmail(e.target.value)}
										placeholder="Optional"
										autoComplete="email"
									/>
								</div>

								{editingCustomer.phone ? (
									<div className="space-y-1">
										<Label className="text-muted-foreground">Phone</Label>
										<p className="text-sm">{editingCustomer.phone}</p>
									</div>
								) : null}

								{saveError ? (
									<p className="text-destructive text-sm">{saveError}</p>
								) : null}

								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										disabled={isSaving}
										onClick={() => setEditingCustomer(null)}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										disabled={isSaving || editName.trim() === ''}
									>
										{isSaving ? 'Saving...' : 'Save changes'}
									</Button>
								</DialogFooter>
							</form>
						) : null}
					</DialogContent>
				</Dialog>
			</div>
		</div>
	)
}
