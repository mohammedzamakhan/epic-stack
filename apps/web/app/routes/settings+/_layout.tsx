import { Link, Outlet, useLoaderData, useLocation, useParams, useRouteLoaderData, type LoaderFunctionArgs } from 'react-router'
import {
	ArrowLeft,
	Menu,
} from 'lucide-react'
// import { NavUserDropdownMenuContent } from '#app/components/nav-user-dropdown-menu-content.tsx'
import {
	Avatar,
	AvatarImage,
	AvatarFallback,
} from '#app/components/ui/avatar.tsx'
import { Button, buttonVariants } from '#app/components/ui/button.tsx'
import { DropdownMenu, DropdownMenuTrigger } from '#app/components/ui/dropdown-menu.js'
import { cn, getUserImgSrc } from '#app/utils/misc.js'

const AccountSettingsPage = () => {
	const location = useLocation()
	const { tenantSlug } = useParams()
	const { user } = useRouteLoaderData('root')

	const isActiveTab = (path: string) => location.pathname.startsWith(path)

	if (tenantSlug) {
		return <Outlet />;
	}

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<header className="flex flex-col border-b">
				<div className="flex items-center justify-between p-2">
					<Link
						to="/"
						className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), ' rounded-full')}
					>
						<ArrowLeft className="h-4 w-4" />
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
						<h1 className="mr-2 text-md font-semibold">Account settings</h1>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger>
							<Button variant="ghost" size="icon">
								<span className="sr-only">Menu</span>
								<Menu className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						{/* <NavUserDropdownMenuContent user={user} side="bottom" /> */}
					</DropdownMenu>
				</div>
				<div className="flex justify-center">
					<div className="inline-flex border-b border-border">
						<Link
							to="/settings/general"
						>
							<Button
								variant="ghost"
                                size="lg"
								className={`px-4 py-2 rounded-none ring-offset-0 ring-0 focus-visible:ring-0 focus-within:ring-0 ${isActiveTab('/settings/general') ? 'border-b-2 border-primary' : ''}`}
							>
								General
							</Button>
						</Link>
						<Link
							to="/settings/organizations"
						>
							<Button
								variant="ghost"
                                size="lg"
								className={`px-4 py-2 rounded-none ring-offset-0 ring-0 focus-visible:ring-0 focus-within:ring-0 ${isActiveTab('/settings/organizations') ? 'border-b-2 border-primary' : ''}`}
							>
								Organizations
							</Button>
						</Link>
					</div>
				</div>
			</header>

			{/* Scrollable Main Content */}
			<main className="flex-1 overflow-y-auto p-8 bg-muted">
				<section className="max-w-4xl mx-auto">
					<Outlet />
				</section>
			</main>
		</div>
	)
}

export default AccountSettingsPage
