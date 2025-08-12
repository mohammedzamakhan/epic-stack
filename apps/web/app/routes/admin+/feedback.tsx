import { useLoaderData } from 'react-router'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table'
import { prisma } from '#app/utils/db.server'
import { requireUserWithRole } from '#app/utils/permissions.server'

export async function loader({ request }: { request: Request }) {
	await requireUserWithRole(request, 'admin')
	const feedback = await prisma.feedback.findMany({
		include: {
			user: {
				select: {
					name: true,
					email: true,
				},
			},
			organization: {
				select: {
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})
	return Response.json({ feedback })
}

export default function AdminFeedbackPage() {
	const { feedback } = useLoaderData<typeof loader>()

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
				<p className="text-muted-foreground">
					Here you can see all the feedback submitted by users.
				</p>
			</div>
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>User</TableHead>
							<TableHead>Organization</TableHead>
							<TableHead>Feedback</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Date</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{feedback.map((item) => (
							<TableRow key={item.id}>
								<TableCell>
									<div>{item.user.name}</div>
									<div className="text-muted-foreground">{item.user.email}</div>
								</TableCell>
								<TableCell>{item.organization.name}</TableCell>
								<TableCell>{item.message}</TableCell>
								<TableCell>{item.type}</TableCell>
								<TableCell>
									{new Date(item.createdAt).toLocaleDateString()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	)
}
