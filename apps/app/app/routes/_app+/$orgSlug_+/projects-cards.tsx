import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@repo/ui/alert-dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useRouteLoaderData, useFetcher } from 'react-router'
import { FolderIcon, type FolderColor } from '#app/components/folder-icon.tsx'
import { type loader } from './projects'

export type Project = {
	id: string
	name: string
	description?: string | null
	color: string
	createdAt: string
	updatedAt: string
	createdBy?: {
		name?: string | null
		username?: string | null
		image?: { objectKey: string } | null
	}
	_count: {
		recordings: number
	}
}

interface ProjectCardProps {
	project: Project
	organizationId?: string
}

export const ProjectCard = ({ project }: ProjectCardProps) => {
	const [isHovered, setIsHovered] = useState(false)
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const navigate = useNavigate()
	const fetcher = useFetcher()
	const loaderData = useRouteLoaderData<typeof loader>(
		'routes/_app+/$orgSlug_+/projects',
	)

	const handleCardClick = () => {
		void navigate(`/${loaderData?.organization.slug}/project/${project.id}`)
	}

	const handleEditClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		void navigate(
			`/${loaderData?.organization.slug}/projects/${project.id}/edit`,
		)
	}

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		setIsDeleteDialogOpen(true)
	}

	const confirmDelete = () => {
		const formData = new FormData()
		formData.append('intent', 'delete-project')
		formData.append('projectId', project.id)
		fetcher.submit(formData, { method: 'post' })
		setIsDeleteDialogOpen(false)
	}

	return (
		<>
			<div
				className="relative cursor-pointer"
				onClick={handleCardClick}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<FolderIcon
					fileCount={project._count.recordings}
					isHovered={isHovered}
					color={project.color as FolderColor}
				/>

				<div
					className={`absolute top-[22%] right-5 transition-opacity duration-200 ${
						isHovered || isDeleteDialogOpen ? 'opacity-100' : 'opacity-0'
					}`}
				>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<button
									className="rounded-md bg-black/30 p-1 text-white transition-colors hover:bg-black/50"
									onClick={(e) => e.stopPropagation()}
								>
									<MoreHorizontal className="h-4 w-4" />
								</button>
							}
						></DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleEditClick}>
								<Pencil className="mr-2 h-4 w-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onClick={handleDeleteClick}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<h2 className="absolute bottom-[12px] left-[12px] line-clamp-2 w-[calc(100%-38px)] text-sm font-medium text-white">
					{project.name}
				</h2>
			</div>

			<AlertDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Project</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{project.name}"? This action
							cannot be undone and will delete all recordings in this project.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation()
								confirmDelete()
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

interface ProjectsCardsProps {
	projects: Project[]
	organizationId: string
}

export const ProjectsCards = ({
	projects,
	organizationId,
}: ProjectsCardsProps) => {
	return (
		<div className="flex flex-wrap gap-4">
			{projects.map((project) => (
				<ProjectCard
					key={project.id}
					project={project}
					organizationId={organizationId}
				/>
			))}
		</div>
	)
}
