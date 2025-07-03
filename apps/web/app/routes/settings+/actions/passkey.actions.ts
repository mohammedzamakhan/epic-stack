import { prisma } from '#app/utils/db.server.ts'

type PasskeyActionArgs = {
  request?: Request
  userId: string
  formData: FormData
}

// Mock function for passkey registration - in a real app, you'd use your passkey API
export async function registerPasskeyAction({ request, userId, formData }: PasskeyActionArgs) {
  return Response.json({ status: 'success' })
}

export async function deletePasskeyAction({ formData, userId }: PasskeyActionArgs) {
  const passkeyId = formData.get('passkeyId')
  if (typeof passkeyId !== 'string') {
    return Response.json(
      { status: 'error', error: 'Invalid passkey ID' },
      { status: 400 },
    )
  }

  await prisma.passkey.delete({
    where: {
      id: passkeyId,
      userId, // Ensure the passkey belongs to the user
    },
  })
  
  return Response.json({ status: 'success' })
}
