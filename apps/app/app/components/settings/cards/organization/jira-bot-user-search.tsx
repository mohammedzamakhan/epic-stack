import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Button } from '@repo/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@repo/ui/card'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { useState } from 'react'
import { toast } from 'sonner'

// Jira user interface
interface JiraUser {
	accountId: string
	displayName: string
	emailAddress?: string
	avatarUrls?: {
		'16x16': string
		'24x24': string
		'32x32': string
		'48x48': string
	}
}

interface JiraBotUserSearchProps {
	integrationId: string
	onSelectUser?: (user: JiraUser) => void
	initialSelectedUserId?: string
}

export function JiraBotUserSearch({
	integrationId,
	onSelectUser,
	initialSelectedUserId,
}: JiraBotUserSearchProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [users, setUsers] = useState<JiraUser[]>([])
	const [currentUser, setCurrentUser] = useState<JiraUser | null>(null)
	const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
		initialSelectedUserId,
	)

	// Fetch current user on component mount
	const fetchCurrentUser = async () => {
		try {
			const response = await fetch(
				`/api/integrations/jira/${integrationId}/current-user`,
				{
					method: 'GET',
				},
			)

			if (!response.ok) {
				throw new Error('Failed to fetch current user')
			}

			const userData = (await response.json()) as JiraUser
			setCurrentUser(userData)
		} catch (error) {
			console.error('Error fetching current user:', error)
			toast.error('Failed to fetch current user information')
		}
	}

	// Search for users
	const searchUsers = async () => {
		if (!searchQuery.trim()) {
			toast.error('Please enter a search query')
			return
		}

		setIsSearching(true)

		try {
			const response = await fetch(
				`/api/integrations/jira/${integrationId}/search-users?query=${encodeURIComponent(searchQuery)}`,
				{
					method: 'GET',
				},
			)

			if (!response.ok) {
				throw new Error('Failed to search users')
			}

			const usersData = (await response.json()) as JiraUser[]
			setUsers(usersData)
		} catch (error) {
			console.error('Error searching users:', error)
			toast.error('Failed to search for users')
		} finally {
			setIsSearching(false)
		}
	}

	// Handle user selection
	const handleSelectUser = (user: JiraUser) => {
		setSelectedUserId(user.accountId)
		if (onSelectUser) {
			onSelectUser(user)
		}
		toast.success(`Selected ${user.displayName} as bot user`)
	}

	// Copy account ID to clipboard
	const copyAccountId = (accountId: string) => {
		navigator.clipboard
			.writeText(accountId)
			.then(() => toast.success('Account ID copied to clipboard'))
			.catch(() => toast.error('Failed to copy account ID'))
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Jira Bot User Search</CardTitle>
				<CardDescription>
					Find users to use as a bot account for Jira issue creation
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Current user info */}
				<div className="mb-6">
					<Button variant="outline" onClick={fetchCurrentUser}>
						Show My Account ID
					</Button>

					{currentUser && (
						<div className="mt-4 rounded-md border p-4">
							<div className="mb-2 flex items-center gap-3">
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={currentUser.avatarUrls?.['32x32']}
										alt={currentUser.displayName}
									/>
									<AvatarFallback>
										{currentUser.displayName.substring(0, 2)}
									</AvatarFallback>
								</Avatar>
								<div>
									<h3 className="font-medium">{currentUser.displayName}</h3>
									<p className="text-muted-foreground text-xs">
										{currentUser.emailAddress}
									</p>
								</div>
							</div>
							<div className="mt-2 flex items-center gap-2">
								<code className="bg-muted rounded px-2 py-1 text-xs">
									{currentUser.accountId}
								</code>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => copyAccountId(currentUser.accountId)}
								>
									Copy ID
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleSelectUser(currentUser)}
								>
									Use As Bot
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* User search */}
				<div>
					<Label htmlFor="user-search">Search for service accounts</Label>
					<div className="mt-1 flex gap-2">
						<Input
							id="user-search"
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						<Button onClick={searchUsers} disabled={isSearching}>
							{isSearching ? 'Searching...' : 'Search'}
						</Button>
					</div>
				</div>

				{/* Results */}
				{users.length > 0 && (
					<div className="mt-4">
						<h3 className="mb-2 text-sm font-medium">
							Results ({users.length})
						</h3>
						<div className="divide-y rounded-md border">
							{users.map((user) => (
								<div
									key={user.accountId}
									className="flex items-center justify-between p-3"
								>
									<div className="flex items-center gap-3">
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={user.avatarUrls?.['32x32']}
												alt={user.displayName}
											/>
											<AvatarFallback>
												{user.displayName.substring(0, 2)}
											</AvatarFallback>
										</Avatar>
										<div>
											<h4 className="font-medium">{user.displayName}</h4>
											{user.emailAddress && (
												<p className="text-muted-foreground text-xs">
													{user.emailAddress}
												</p>
											)}
											<code className="bg-muted rounded px-1 py-0.5 text-xs">
												{user.accountId}
											</code>
										</div>
									</div>
									<div className="flex gap-2">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => copyAccountId(user.accountId)}
										>
											Copy ID
										</Button>
										<Button
											variant={
												selectedUserId === user.accountId
													? 'default'
													: 'outline'
											}
											size="sm"
											onClick={() => handleSelectUser(user)}
										>
											{selectedUserId === user.accountId
												? 'Selected'
												: 'Select'}
										</Button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
