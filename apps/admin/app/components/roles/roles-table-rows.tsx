import { Link } from 'react-router'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { TableCell, TableRow } from '@repo/ui/table'

interface Role {
	id: string
	name: string
	level?: number
	description: string | null
	permissions: unknown[]
	_count: {
		users: number
	}
}

interface RolesTableRowsProps {
	roles: Role[]
	baseUrl: string
	emptyMessage: string
	emptyColSpan: number
	showLevel?: boolean
}

/**
 * Shared component for rendering role table rows
 * Used for both organization and system roles tables
 */
export function RolesTableRows({
	roles,
	baseUrl,
	emptyMessage,
	emptyColSpan,
	showLevel = false,
}: RolesTableRowsProps) {
	return (
		<>
			{roles.map((role) => (
				<TableRow key={role.id}>
					<TableCell className="font-medium">
						<Link to={`${baseUrl}/${role.id}`} className="hover:underline">
							{role.name}
						</Link>
					</TableCell>
					{showLevel && role.level !== undefined && (
						<TableCell>
							<Badge variant="secondary">{role.level}</Badge>
						</TableCell>
					)}
					<TableCell>{role._count.users}</TableCell>
					<TableCell>{role.permissions.length}</TableCell>
					<TableCell className="text-muted-foreground">
						{role.description || 'No description'}
					</TableCell>
					<TableCell className="text-right">
						<Button asChild variant="ghost" size="sm">
							<Link to={`${baseUrl}/${role.id}`}>Edit</Link>
						</Button>
					</TableCell>
				</TableRow>
			))}
			{roles.length === 0 && (
				<TableRow>
					<TableCell
						colSpan={emptyColSpan}
						className="text-muted-foreground text-center"
					>
						{emptyMessage}
					</TableCell>
				</TableRow>
			)}
		</>
	)
}
