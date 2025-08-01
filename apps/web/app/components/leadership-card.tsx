import { cn } from '#app/utils/misc.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './ui/card'

interface LeadershipUser {
	id: string
	name: string
	email: string
	notesCount: number
	rank: number
}

interface LeadershipCardProps {
	leaders: LeadershipUser[]
	className?: string
}

const getRankIcon = (rank: number) => {
	switch (rank) {
		case 1:
			return '👑'
		case 2:
			return '🥈'
		case 3:
			return '🥉'
		default:
			return null
	}
}

const getAvatarColor = (index: number) => {
	const colors = [
		'bg-blue-500',
		'bg-green-500',
		'bg-cyan-500',
		'bg-gray-400',
		'bg-gray-600',
		'bg-purple-500',
	]
	return colors[index % colors.length]
}

export function LeadershipCard({ leaders, className }: LeadershipCardProps) {
	return (
		<Card className={cn('w-full', className)}>
			<CardHeader>
				<CardTitle>Top Contributors</CardTitle>
				<CardDescription>
					Team members who have created the most notes
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-1">
					<div className="text-muted-foreground grid grid-cols-2 gap-4 border-b pb-2 text-sm font-medium">
						<div>Rank</div>
						<div>Team member</div>
					</div>
					{leaders.length === 0 ? (
						<div className="text-muted-foreground py-8 text-center">
							No notes created yet
						</div>
					) : (
						leaders.map((leader, index) => (
							<div
								key={leader.id}
								className="grid grid-cols-2 items-center gap-4 border-b py-1 last:border-b-0"
							>
								<div className="flex items-center gap-2">
									<span className="text-md font-semibold">{leader.rank}</span>
									{getRankIcon(leader.rank) && (
										<span className="text-md">{getRankIcon(leader.rank)}</span>
									)}
								</div>
								<div className="flex items-center gap-3">
									<div
										className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white ${getAvatarColor(
											index,
										)}`}
									>
										{leader.name.charAt(0).toUpperCase()}
									</div>
									<div className="flex-1">
										<div className="text-sm font-medium">{leader.name}</div>
										<div className="text-muted-foreground text-xs">
											{leader.notesCount} note
											{leader.notesCount !== 1 ? 's' : ''}
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</CardContent>
		</Card>
	)
}
