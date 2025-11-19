import { Trans } from '@lingui/macro'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { cn, getUserImgSrc } from '#app/utils/misc.tsx'

interface LeadershipUser {
	id: string
	name: string
	email: string
	notesCount: number
	rank: number
	image?: { objectKey: string } | null
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
				<CardTitle>
					<Trans>Top Contributors</Trans>
				</CardTitle>
				<CardDescription>
					<Trans>Team members who have created the most notes</Trans>
				</CardDescription>
			</CardHeader>
			<CardContent className="h-full">
				<div className="space-y-1">
					<div className="text-muted-foreground grid grid-cols-2 gap-4 border-b pb-2 text-sm font-medium">
						<div>
							<Trans>Rank</Trans>
						</div>
						<div>
							<Trans>Team member</Trans>
						</div>
					</div>
					{leaders.length === 0 ? (
						<div className="text-muted-foreground py-8 text-center">
							<Trans>No notes created yet</Trans>
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
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={getUserImgSrc(leader.image?.objectKey)}
											alt={leader.name}
										/>
										<AvatarFallback className={getAvatarColor(index)}>
											{leader.name.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<div className="text-sm font-medium">{leader.name}</div>
										<div className="text-muted-foreground text-xs">
											{leader.notesCount}{' '}
											{leader.notesCount !== 1 ? (
												<Trans>notes</Trans>
											) : (
												<Trans>note</Trans>
											)}
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
