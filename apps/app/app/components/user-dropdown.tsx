import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuItem,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { Img } from 'openimg/react'
import { useRef } from 'react'
import { Link, Form } from 'react-router'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { useCurrentOrganization } from '#app/utils/organization/organizations.ts'
import { useUser } from '#app/utils/user.ts'

export function UserDropdown() {
	const user = useUser()
	const { organization } = useCurrentOrganization()
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger>
				<Button variant="secondary">
					<Link
						to={`/users/${user.username}`}
						// this is for progressive enhancement
						onClick={(e) => e.preventDefault()}
						className="flex items-center gap-2"
					>
						<Img
							className="size-8 rounded-full object-cover"
							alt={user.name ?? user.username}
							src={getUserImgSrc(user.image?.objectKey)}
							width={256}
							height={256}
						/>
						<span className="text-body-sm font-bold">
							{user.name ?? user.username}
						</span>
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="end">
					<DropdownMenuItem>
						<Link prefetch="intent" to={`/profile`}>
							<Icon className="text-body-md" name="user">
								<Trans>Profile</Trans>
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Link prefetch="intent" to={`/${organization.slug}`}>
							<Icon className="text-body-md" name="clock">
								<Trans>Dashboard</Trans>
							</Icon>
						</Link>
					</DropdownMenuItem>
					<Form action="/logout" method="POST" ref={formRef}>
						<DropdownMenuItem>
							<button type="submit" className="w-full">
								<Icon className="text-body-md" name="log-out">
									<Trans>Logout</Trans>
								</Icon>
							</button>
						</DropdownMenuItem>
					</Form>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
