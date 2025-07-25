import { Search, ChevronRight, FolderOpen } from 'lucide-react'
import { Img } from 'openimg/react'
import { useState } from 'react'
import { type LoaderFunctionArgs, Link, useLoaderData } from 'react-router'
import { Button } from '#app/components/ui/button'
import { Input } from '#app/components/ui/input'
import { PageTitle } from '#app/components/ui/page-title'
import { requireUserId } from '#app/utils/auth.server'
import {
	type UserOrganizationWithRole,
	getUserOrganizations,
} from '#app/utils/organizations.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const organizations = await getUserOrganizations(userId)

	return { organizations }
}

export default function OrganizationsPage() {
	const { organizations } = useLoaderData<typeof loader>()
	const [searchQuery, setSearchQuery] = useState('')

	const filteredOrganizations = organizations.filter(
		(org: UserOrganizationWithRole) =>
			org.organization.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			org.organization.slug.toLowerCase().includes(searchQuery.toLowerCase()),
	)

	function getOrgImgSrc(objectKey?: string | null) {
		return objectKey
			? `/resources/images?objectKey=${encodeURIComponent(objectKey)}`
			: '/img/user.png'
	}

	return (
		<div className="container max-w-2xl py-8">
			<div className="mb-8">
				<PageTitle
					title="Organizations"
					description="Jump into an existing organization or add a new one."
				/>

				<div className="mt-4 flex items-center gap-3">
					<div className="relative flex-1">
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
						<Input
							type="text"
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="bg-background pl-10"
						/>
					</div>
					<Button asChild>
						<Link to="/organizations/create">
							<span className="mr-1">+</span>
							Add organization
						</Link>
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				{filteredOrganizations.map((org: UserOrganizationWithRole) => (
					<Link
						key={org.organization.id}
						to={`/app/${org.organization.slug}`}
						className="block"
					>
						<div className="bg-background flex items-center justify-between rounded-lg border p-4 transition-colors hover:shadow-sm">
							<div className="flex items-center gap-3">
								<div className="ring-muted bg-muted flex h-10 w-10 items-center justify-center overflow-hidden rounded-md text-sm font-medium ring-2 ring-offset-2">
									{org.organization.image?.objectKey ? (
										<Img
											src={getOrgImgSrc(org.organization.image.objectKey)}
											alt={org.organization.name}
											className="h-full w-full object-cover"
											width={40}
											height={40}
										/>
									) : (
										<span>{org.organization.name.charAt(0).toUpperCase()}</span>
									)}
								</div>
								<div>
									<div className="font-medium">{org.organization.name}</div>
									<div className="text-muted-foreground text-sm">
										/app/{org.organization.slug}
									</div>
								</div>
							</div>
							<div className="text-muted-foreground flex items-center gap-2">
								<span className="text-sm">1</span>
								<ChevronRight className="h-4 w-4" />
							</div>
						</div>
					</Link>
				))}

				{(filteredOrganizations.length === 0 && searchQuery) ||
				organizations.length === 0 ? (
					<div className="border-border rounded-lg border p-12">
						<div className="flex flex-col items-center justify-center text-center">
							<div className="bg-muted mb-4 rounded-lg p-3">
								<FolderOpen className="text-muted-foreground h-8 w-8" />
							</div>
							<div className="mb-2 text-lg font-medium">
								No organization found
							</div>
							<p className="text-muted-foreground text-sm">
								{searchQuery
									? 'Adjust your search query to show more.'
									: "You haven't joined any organizations yet."}
							</p>
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}
