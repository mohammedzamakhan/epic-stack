import {
	Avatar,
	AvatarImage,
	AvatarFallback,
	Button,
	buttonVariants,
	DropdownMenu,
	DropdownMenuTrigger,
	Icon,
} from '@repo/ui'
import {
	Link,
	Outlet,
	useLocation,
	useParams,
	useRouteLoaderData,
} from 'react-router'

import { cn, getUserImgSrc } from '#app/utils/misc.js'

const AccountSettingsPage = () => {
	const location = useLocation()
	const { tenantSlug } = useParams()
	const { user } = useRouteLoaderData('root')

	const isActiveTab = (path: string) => location.pathname.startsWith(path)

	if (tenantSlug) {
		return <Outlet />
	}

	return (
		<div className="bg-background text-foreground flex h-screen flex-col">
			<header className="flex flex-col border-b">
				<div className="flex items-center justify-between p-2">
					<Link
						to="/"
						className={cn(
							buttonVariants({ variant: 'ghost', size: 'icon' }),
							'rounded-full',
						)}
					>
						<Icon name="arrow-left" className="h-4 w-4" />
					</Link>
					<div className="flex items-center gap-3">
						<Avatar className="h-8 w-8 rounded-full">
							<AvatarImage
								src={getUserImgSrc(user?.image?.id)}
								alt="User Avatar"
								className="object-cover"
							/>
							<AvatarFallback className="rounded-full">ZK</AvatarFallback>
						</Avatar>
						<h1 className="text-md mr-2 font-semibold">Account settings</h1>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="ghost" size="icon">
								<span className="sr-only">Menu</span>
								<Icon name="hamburger-menu" className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						{/* <NavUserDropdownMenuContent user={user} side="bottom" /> */}
					</DropdownMenu>
				</div>
				<div className="flex justify-center">
					<div className="border-border inline-flex border-b">
						<Link to="/settings/general">
							<Button
								variant="ghost"
								size="lg"
								className={`rounded-none px-4 py-2 ring-0 ring-offset-0 focus-within:ring-0 focus-visible:ring-0 ${isActiveTab('/settings/general') ? 'border-primary border-b-2' : ''}`}
							>
								General
							</Button>
						</Link>
						<Link to="/settings/organizations">
							<Button
								variant="ghost"
								size="lg"
								className={`rounded-none px-4 py-2 ring-0 ring-offset-0 focus-within:ring-0 focus-visible:ring-0 ${isActiveTab('/settings/organizations') ? 'border-primary border-b-2' : ''}`}
							>
								Organizations
							</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Scrollable Main Content */}
			<main className="flex-1 overflow-y-auto p-8">
				<section className="mx-auto max-w-4xl">
					<Outlet />
				</section>
			</main>
		</div>
	)
}

export default AccountSettingsPage
