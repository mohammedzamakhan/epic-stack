import { Form, Link } from 'react-router'
import { Icon } from '#app/components/ui/icon'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu'
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '#app/components/ui/sidebar'

interface FavoriteNote {
	note: {
		id: string
		title: string
	}
}

interface FavoriteNotesProps {
	favoriteNotes: FavoriteNote[]
	orgSlug: string
}

export default function FavoriteNotes({
	favoriteNotes,
	orgSlug,
}: FavoriteNotesProps) {
	const { isMobile } = useSidebar()

	if (!favoriteNotes || favoriteNotes.length === 0) {
		return null
	}

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>
				<Icon name="star" className="mr-2 h-4 w-4" />
				Favorites
			</SidebarGroupLabel>
			<SidebarMenu>
				{favoriteNotes.map((favorite) => (
					<SidebarMenuItem key={favorite.note.id}>
						<SidebarMenuButton asChild>
							<Link to={`/app/${orgSlug}/notes/${favorite.note.id}`}>
								<Icon name="file-text" />
								<span>{favorite.note.title}</span>
							</Link>
						</SidebarMenuButton>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuAction showOnHover className="rounded-sm">
									<Icon name="dots-horizontal" />
									<span className="sr-only">More</span>
								</SidebarMenuAction>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-32 rounded-lg"
								side={isMobile ? 'bottom' : 'right'}
								align={isMobile ? 'end' : 'start'}
							>
								<DropdownMenuItem asChild className="gap-2">
									<Link to={`/app/${orgSlug}/notes/${favorite.note.id}`}>
										<Icon name="link-2" />
										<span>Open</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild className="gap-2">
									<Link to={`/app/${orgSlug}/notes/${favorite.note.id}/edit`}>
										<Icon name="pencil-1" />
										<span>Edit</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Form
										method="post"
										action={`/app/${orgSlug}/notes/${favorite.note.id}`}
									>
										<input
											type="hidden"
											name="intent"
											value="toggle-favorite"
										/>
										<input
											type="hidden"
											name="noteId"
											value={favorite.note.id}
										/>
										<button
											type="submit"
											className="text-destructive flex w-full items-center gap-2"
										>
											<Icon name="star-off" />
											<span>Unstar</span>
										</button>
									</Form>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	)
}
