import { useState, useEffect } from 'react'
import { useFetcher } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { Switch } from '#app/components/ui/switch.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Avatar, AvatarFallback } from '#app/components/ui/avatar.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Separator } from '#app/components/ui/separator.tsx'



type ShareNoteButtonProps = {
	noteId: string
	isPublic: boolean
	noteAccess: Array<{
		id: string
		user: {
			id: string
			name: string | null
			username: string
		}
	}>
	organizationMembers: Array<{
		userId: string
		user: {
			id: string
			name: string | null
			username: string
		}
	}>
}

export function ShareNoteButton({
	noteId,
	isPublic,
	noteAccess,
	organizationMembers,
}: ShareNoteButtonProps) {
	const [open, setOpen] = useState(false)
	const fetcher = useFetcher()

	// Local state for form changes (not submitted yet)
	const [localIsPublic, setLocalIsPublic] = useState(isPublic)
	const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
		noteAccess.map(access => access.user.id)
	)
	const [searchQuery, setSearchQuery] = useState('')

	// Reset local state when dialog opens or props change
	useEffect(() => {
		if (open) {
			setLocalIsPublic(isPublic)
			setSelectedMemberIds(noteAccess.map(access => access.user.id))
			setSearchQuery('')
		}
	}, [open, isPublic, noteAccess])

	// Close dialog on successful submission
	useEffect(() => {
		if (fetcher.data?.result?.status === 'success') {
			setOpen(false)
		}
	}, [fetcher.data])

	const toggleMemberSelection = (userId: string) => {
		setSelectedMemberIds(prev =>
			prev.includes(userId)
				? prev.filter(id => id !== userId)
				: [...prev, userId]
		)
	}

	const removeMember = (userId: string) => {
		setSelectedMemberIds(prev => prev.filter(id => id !== userId))
	}

	const handleSubmit = () => {
		const formData = new FormData()

		// Handle member access changes
		const currentAccessIds = new Set(noteAccess.map(access => access.user.id))
		const newAccessIds = new Set(selectedMemberIds)

		// Members to add
		const toAdd = selectedMemberIds.filter(id => !currentAccessIds.has(id))
		// Members to remove
		const toRemove = noteAccess
			.map(access => access.user.id)
			.filter(id => !newAccessIds.has(id))

		// Check if we only need to update public/private status without member changes
		const hasPublicStatusChange = localIsPublic !== isPublic
		const hasMemberChanges = toAdd.length > 0 || toRemove.length > 0

		if (hasPublicStatusChange && !hasMemberChanges) {
			// Simple public/private toggle - use the original intent
			formData.append('intent', 'update-note-sharing')
			formData.append('noteId', noteId)
			formData.append('isPublic', localIsPublic.toString())
		} else {
			// Complex changes or member changes - use batch operation
			formData.append('intent', 'batch-update-note-access')
			formData.append('noteId', noteId)
			formData.append('isPublic', localIsPublic.toString())

			// Add users to add
			toAdd.forEach(userId => {
				formData.append('usersToAdd', userId)
			})

			// Add users to remove
			toRemove.forEach(userId => {
				formData.append('usersToRemove', userId)
			})
		}

		fetcher.submit(formData, { method: 'POST' })
	}

	const filteredMembers = organizationMembers.filter(member =>
		(member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			member.user.username.toLowerCase().includes(searchQuery.toLowerCase())) &&
		(!localIsPublic || !selectedMemberIds.includes(member.user.id))
	)

	const getSelectedMemberDetails = () => {
		return organizationMembers
			.filter(member => selectedMemberIds.includes(member.user.id))
			.map(member => member.user)
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="min-[525px]:max-md:aspect-square min-[525px]:max-md:px-0"
				>
					<Icon name="share-2" className="h-4 w-4 max-md:scale-125">
						<span className="max-md:hidden">Share</span>
					</Icon>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Share Note</DialogTitle>
					<DialogDescription>
						Control who can access this note
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{/* Public/Private Toggle */}
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="public-toggle" className="text-base">Public Access</Label>
							<div className="text-sm text-muted-foreground">
								{localIsPublic
									? "All organization members can view this note"
									: "Only selected members can access this note"
								}
							</div>
						</div>
						<Switch
							id="public-toggle"
							checked={localIsPublic}
							onCheckedChange={setLocalIsPublic}
							disabled={fetcher.state !== 'idle'}
						/>
					</div>

					{/* Private Mode - Member Selection */}
					{!localIsPublic && (
						<>
							<Separator />

							{/* Selected Members */}
							{selectedMemberIds.length > 0 && (
								<div className="space-y-3">
									<Label className="text-sm font-medium">Selected Members</Label>
									<div className="flex flex-wrap gap-2">
										{getSelectedMemberDetails().map((user) => (
											<Badge
												key={user.id}
												variant="secondary"
												className="flex items-center gap-2 pr-1"
											>
												<Avatar className="h-5 w-5">
													<AvatarFallback className="text-xs">
														{(user.name || user.username)
															.charAt(0)
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<span className="text-xs">
													{user.name || user.username}
												</span>
												<Button
													variant="ghost"
													size="sm"
													className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
													onClick={() => removeMember(user.id)}
												>
													<Icon name="cross-1" className="h-3 w-3" />
												</Button>
											</Badge>
										))}
									</div>
								</div>
							)}

							{/* Member Search */}
							<div className="space-y-3">
								<Label className="text-sm font-medium">Add Members</Label>
								<div className="relative">
									<Icon name="magnifying-glass" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										placeholder="Search team members..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="pl-9"
									/>
								</div>

								{/* Member List */}
								<div className="max-h-48 overflow-y-auto space-y-2">
									{filteredMembers.map((member) => (
										<div
											key={member.userId}
											className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${selectedMemberIds.includes(member.user.id)
												? "bg-primary/10 border-primary"
												: "hover:bg-muted"
												}`}
											onClick={() => toggleMemberSelection(member.user.id)}
										>
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<AvatarFallback className="text-sm">
														{(member.user.name || member.user.username)
															.charAt(0)
															.toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div>
													<div className="text-sm font-medium">
														{member.user.name || member.user.username}
													</div>
													<div className="text-xs text-muted-foreground">
														@{member.user.username}
													</div>
												</div>
											</div>
											{selectedMemberIds.includes(member.user.id) && (
												<Badge variant="default" className="text-xs">
													Selected
												</Badge>
											)}
										</div>
									))}
								</div>
							</div>
						</>
					)}

					{/* Action Buttons */}
					<div className="flex justify-end gap-2 pt-4">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={fetcher.state !== 'idle'}
						>
							Cancel
						</Button>
						<StatusButton
							status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
							onClick={handleSubmit}
							disabled={fetcher.state !== 'idle'}
						>
							{localIsPublic
								? "Make Public"
								: `Share with ${selectedMemberIds.length} member${selectedMemberIds.length !== 1 ? 's' : ''}`
							}
						</StatusButton>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}