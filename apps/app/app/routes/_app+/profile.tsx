import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { parseFormData } from '@mjackson/form-data-parser'
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { brand } from '@repo/config/brand'
import { prisma } from '@repo/database'
import { generateSeoMeta } from '@repo/seo'
import { AnnotatedLayout, AnnotatedSection } from '@repo/ui/annotated-layout'
import { PageTitle } from '@repo/ui/page-title'
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type MetaFunction,
	useLoaderData,
} from 'react-router'
import { ProfileCard } from '#app/components/settings/cards/profile-card.tsx'

import { requireUserId } from '#app/utils/auth.server.ts'
import { changeEmailAction } from '../settings+/actions/email.actions'
import { photoAction } from '../settings+/actions/photo.actions'
import { profileUpdateAction } from '../settings+/actions/profile.actions'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export const meta: MetaFunction = () => {
	// Protected routes should not be indexed by search engines
	return generateSeoMeta({
		title: `Profile Settings | ${brand.name}`,
		description: 'Manage your account settings and set e-mail preferences.',
		robots: {
			index: false,
			follow: false,
		},
	})
}

// Photo upload schema
const MAX_SIZE = 1024 * 1024 * 3 // 3MB

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			username: true,
			email: true,
			image: {
				select: { objectKey: true },
			},
		},
	})

	return {
		user,
	}
}

export const profileUpdateActionIntent = 'update-profile'
export const changeEmailActionIntent = 'change-email'
export const uploadPhotoActionIntent = 'upload-photo'
export const deletePhotoActionIntent = 'delete-photo'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const contentType = request.headers.get('content-type')

	let intent

	if (contentType?.includes('multipart/form-data')) {
		const formData = await parseFormData(request, { maxFileSize: MAX_SIZE })
		intent = formData.get('intent')

		if (
			intent === uploadPhotoActionIntent ||
			intent === deletePhotoActionIntent
		) {
			return photoAction({ userId, formData, request })
		}
	}

	const formData = await request.formData()
	intent = formData.get('intent')

	switch (intent) {
		case profileUpdateActionIntent: {
			return profileUpdateAction({ userId, formData })
		}
		case changeEmailActionIntent: {
			return changeEmailAction({ request, userId, formData })
		}
		default: {
			throw new Response(`Invalid intent "${intent}"`, { status: 400 })
		}
	}
}

export default function ProfileSettings() {
	const data = useLoaderData<typeof loader>()
	const { _ } = useLingui()

	return (
		<div className="my-8 flex flex-1 flex-col gap-4 md:m-8">
			<AnnotatedLayout>
				<PageTitle
					title={_(t`Profile Settings`)}
					description={_(
						t`Manage your account settings and set e-mail preferences.`,
					)}
				/>
				<AnnotatedSection>
					<ProfileCard user={data.user} />
				</AnnotatedSection>
			</AnnotatedLayout>
		</div>
	)
}
