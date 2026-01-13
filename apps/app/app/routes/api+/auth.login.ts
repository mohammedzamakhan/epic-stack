import { parseWithZod } from '@conform-to/zod'
import { detectBot, slidingWindow } from '@arcjet/remix'
import { UsernameSchema, PasswordSchema } from '@repo/validation'
import { data } from 'react-router'
import { z } from 'zod'
import arcjet from '#app/utils/arcjet.server.ts'
import { login } from '#app/utils/auth.server.ts'
import { checkHoneypot } from '#app/utils/honeypot.server.ts'
import { createAuthenticatedSessionResponse } from '#app/utils/jwt.server.ts'
import { type Route } from './+types/auth.login.ts'

// Add rules to the base Arcjet instance for login protection
const aj = arcjet
    .withRule(
        detectBot({
            // Will block requests. Use "DRY_RUN" to log only.
            mode: 'LIVE',
            // Configured with a list of bots to allow from https://arcjet.com/bot-list.
            // Blocks all bots except monitoring services.
            allow: ['CATEGORY:MONITOR'],
        }),
    )
    .withRule(
        // Chain bot protection with rate limiting.
        // A login form shouldn't be submitted more than a few times a minute to prevent brute force.
        slidingWindow({
            mode: 'LIVE',
            max: 10, // 10 requests per window.
            interval: '60s', // 60 second sliding window.
        }),
    )

const LoginFormSchema = z.object({
    username: UsernameSchema,
    password: PasswordSchema,
    redirectTo: z.string().optional(),
    remember: z
        .union([z.boolean(), z.string()])
        .optional()
        .transform((val) => {
            if (typeof val === 'string') {
                return val === 'on' || val === 'true'
            }
            return Boolean(val)
        }),
})

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData()
    await checkHoneypot(formData)

    // Arcjet security protection for login (skip in test environment)
    if (process.env.ARCJET_KEY && process.env.NODE_ENV !== 'test') {
        try {
            const decision = await aj.protect({ request, context: {} })

            if (decision.isDenied()) {
                let errorMessage = 'Access denied'

                if (decision.reason.isBot()) {
                    errorMessage = 'Forbidden'
                } else if (decision.reason.isRateLimit()) {
                    errorMessage = 'Too many login attempts - try again shortly'
                }

                // Return early with error response
                return data(
                    {
                        success: false,
                        error: 'rate_limited',
                        message: errorMessage,
                    },
                    { status: 429 },
                )
            }
        } catch (error) {
            // If Arcjet fails, log error but continue with login process
            console.error('Arcjet protection failed:', error)
        }
    }

    const submission = await parseWithZod(formData, {
        schema: LoginFormSchema.transform(async (data, ctx) => {
            const session = await login({ ...data, request })
            if (!session) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Invalid username or password',
                })
                return z.NEVER
            }
            return { ...data, session }
        }),
        async: true,
    })

    if (submission.status !== 'success' || !submission.value.session) {
        return data(
            {
                success: false,
                error: 'authentication_failed',
                message: 'Invalid username or password',
            },
            { status: 400 },
        )
    }

    const { session } = submission.value

    // Use shared helper to create authenticated session response
    const response = await createAuthenticatedSessionResponse(
        session.userId,
        request,
    )

    if (!response.success) {
        return data(response, { status: 400 })
    }

    return data(response)
}
