import { parseWithZod } from '@conform-to/zod'
import { z } from 'zod'

import { prepareVerification } from '#app/routes/_auth+/verify.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { newEmailAddressSessionKey } from '../profile.change-email'

export const ChangeEmailSchema = z.object({
  email: z.string().email({ message: 'Please provide a valid email address' })
})

type EmailActionArgs = {
  formData: FormData
  userId: string
  request: Request
}

export async function changeEmailAction({ formData, userId, request }: EmailActionArgs) {
  const submission = await parseWithZod(formData, {
    schema: ChangeEmailSchema.superRefine(async (data, ctx) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      })
      if (existingUser) {
        ctx.addIssue({
          path: ['email'],
          code: z.ZodIssueCode.custom,
          message: 'This email is already in use.',
        })
      }
    }),
    async: true,
  })

  if (submission.status !== 'success') {
    return Response.json(
      { result: submission.reply(), status: 'error' },
      { status: submission.status === 'error' ? 400 : 200 },
    )
  }
  
  const { otp, redirectTo, verifyUrl } = await prepareVerification({
    period: 10 * 60,
    request,
    target: userId,
    type: 'change-email',
  })

  const verifySession = await verifySessionStorage.getSession()
  verifySession.set(newEmailAddressSessionKey, submission.value.email)
  
  return Response.json({
    status: 'success',
    result: submission.reply(),
    verificationInfo: {
      otp,
      verifyUrl: verifyUrl.toString(),
      email: submission.value.email
    }
  }, {
    headers: {
      'set-cookie': await verifySessionStorage.commitSession(verifySession),
    },
  })
}
