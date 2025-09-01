import { useLoaderData } from 'react-router'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@repo/ui'
import { type Feedback, type Organization, type User } from '@prisma/client'

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

type LoaderData = {
	feedback: (Omit<Feedback, 'createdAt' | 'updatedAt'> & {
		createdAt: string
		updatedAt: string
		user: Pick<User, 'name' | 'email'>
		organization: Pick<Organization, 'name'>
	})[]
}

export default function AdminFeedbackPage() {
	const { feedback } = useLoaderData() as LoaderData

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Feedback</h1>
				<p className="text-muted-foreground">
					Here you can see all the feedback submitted by users.
				</p>
			</div>
			<div>
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
