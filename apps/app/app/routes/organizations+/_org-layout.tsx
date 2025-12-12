import { Outlet, useRouteLoaderData } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Logo } from '#app/components/icons/logo.tsx'
import { type loader as rootLoader } from '#app/root.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: { request: Request }) {
	// This ensures users must be logged in to access any organization routes
	await requireUserId(request)
	return null
}

export default function OrganizationLayout() {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	return (
		<div className="bg-background flex min-h-screen flex-col">
			<header className="border-b p-2 shadow-xs">
				<div className="container flex items-center justify-between p-2">
					<Logo />
					<div className="flex items-center gap-2">
						<Avatar className="h-8 w-8 rounded-full">
							<AvatarImage
								src={
									rootData?.user?.image
										? `/resources/images?objectKey=${rootData.user.image.objectKey}`
										: undefined
								}
								alt={rootData?.user?.name || 'User avatar'}
							/>
							<AvatarFallback className="rounded-full">
								{rootData?.user?.name?.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<span>{rootData?.user?.name}</span>
					</div>
				</div>
			</header>
			<div className="bg-muted/10 flex-1">
				<Outlet />
			</div>
		</div>
	)
}
