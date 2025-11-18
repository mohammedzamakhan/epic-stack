import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { faker } from '@faker-js/faker'
import fsExtra from 'fs-extra'
import { HttpResponse, passthrough, http, type HttpHandler } from 'msw'
import { USERNAME_MAX_LENGTH } from '@repo/validation'

const { json } = HttpResponse

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const here = (...s: Array<string>) => path.join(__dirname, ...s)

const githubUserFixturePath = path.join(
    here(
        '..',
        '..',
        'fixtures',
        'github',
        `users.${process.env.VITEST_POOL_ID || 0}.local.json`,
    ),
)

await fsExtra.ensureDir(path.dirname(githubUserFixturePath))

function createGitHubUser(code?: string | null) {
    const createEmail = () => ({
        email: faker.internet.email(),
        verified: faker.datatype.boolean(),
        primary: false, // <-- can only have one of these
        visibility: faker.helpers.arrayElement(['public', null]),
    })
    const primaryEmail = {
        ...createEmail(),
        verified: true,
        primary: true,
    }

    const emails = [
        {
            email: faker.internet.email(),
            verified: false,
            primary: false,
            visibility: 'public',
        },
        {
            email: faker.internet.email(),
            verified: true,
            primary: false,
            visibility: null,
        },
        primaryEmail,
    ]

    code ??= faker.string.uuid()
    return {
        code,
        accessToken: `${code}_mock_access_token`,
        profile: {
            login: faker.internet.username().slice(0, USERNAME_MAX_LENGTH),
            id: faker.number.int(),
            name: faker.person.fullName(),
            avatar_url: 'https://github.com/ghost.png',
            emails: emails.map((e) => e.email),
        },
        emails,
        primaryEmail: primaryEmail.email,
    }
}

export type GitHubUser = ReturnType<typeof createGitHubUser>

async function getGitHubUsers() {
    try {
        if (await fsExtra.pathExists(githubUserFixturePath)) {
            const json = await fsExtra.readJson(githubUserFixturePath)
            return json as Array<GitHubUser>
        }
        return []
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function deleteGitHubUser(primaryEmail: string) {
    const users = await getGitHubUsers()
    const user = users.find((u) => u.primaryEmail === primaryEmail)
    if (!user) return null
    await setGitHubUsers(users.filter((u) => u.primaryEmail !== primaryEmail))
    return user
}

export async function deleteGitHubUsers() {
    await fsExtra.remove(githubUserFixturePath)
}

async function setGitHubUsers(users: Array<GitHubUser>) {
    await fsExtra.writeJson(githubUserFixturePath, users, { spaces: 2 })
}

export async function insertGitHubUser(code?: string | null) {
    const githubUsers = await getGitHubUsers()
    let user = githubUsers.find((u) => u.code === code)
    if (user) {
        Object.assign(user, createGitHubUser(code))
    } else {
        user = createGitHubUser(code)
        githubUsers.push(user)
    }
    await setGitHubUsers(githubUsers)
    return user
}

async function getUser(request: Request) {
    const accessToken = request.headers
        .get('authorization')
        ?.slice('Bearer '.length)

    if (!accessToken) {
        return new Response('Unauthorized', { status: 401 })
    }
    const user = (await getGitHubUsers()).find(
        (u) => u.accessToken === accessToken,
    )

    if (!user) {
        return new Response('Not Found', { status: 404 })
    }
    return user
}

const passthroughGitHub =
    !process.env.GITHUB_CLIENT_ID?.startsWith('MOCK_') &&
    process.env.NODE_ENV !== 'test'

export const handlers: Array<HttpHandler> = [
    http.post(
        'https://github.com/login/oauth/access_token',
        async ({ request }) => {
            if (passthroughGitHub) return passthrough()
            const params = new URLSearchParams(await request.text())

            const code = params.get('code')
            const githubUsers = await getGitHubUsers()
            let user = githubUsers.find((u) => u.code === code)
            if (!user) {
                user = await insertGitHubUser(code)
            }

            return json(
                {
                    access_token: user.accessToken,
                    token_type: '__MOCK_TOKEN_TYPE__',
                },
                { headers: { 'content-type': 'application/x-www-form-urlencoded' } },
            )
        },
    ),
    http.get('https://api.github.com/user/emails', async ({ request }) => {
        if (passthroughGitHub) return passthrough()

        const user = await getUser(request)
        if (user instanceof Response) return user

        return json(user.emails)
    }),
    http.get('https://api.github.com/user/:id', async ({ params }) => {
        if (passthroughGitHub) return passthrough()

        const mockUser = (await getGitHubUsers()).find(
            (u) => u.profile.id === Number(params.id),
        )
        if (mockUser) return json(mockUser.profile)

        return new Response('Not Found', { status: 404 })
    }),
    http.get('https://api.github.com/user', async ({ request }) => {
        if (passthroughGitHub) return passthrough()

        const user = await getUser(request)
        if (user instanceof Response) return user

        return json(user.profile)
    }),
    http.get('https://github.com/ghost.png', async () => {
        if (passthroughGitHub) return passthrough()

        const buffer = await fsExtra.readFile('./tests/fixtures/github/ghost.jpg')
        return new Response(buffer, {
            // the .png is not a mistake even though it looks like it... It's really a jpg
            // but the ghost image URL really has a png extension 😅
            headers: { 'content-type': 'image/jpg' },
        })
    }),
    // GitHub Integration API endpoints
    http.get('https://api.github.com/user/repos', async ({ request }) => {
        if (passthroughGitHub) return passthrough()

        const user = await getUser(request)
        if (user instanceof Response) return user

        // Mock repository data for testing
        const mockRepos = [
            {
                id: 1,
                name: 'test-repo',
                full_name: `${user.profile.login}/test-repo`,
                description: 'A test repository for integration testing',
                private: false,
                html_url: `https://github.com/${user.profile.login}/test-repo`,
                clone_url: `https://github.com/${user.profile.login}/test-repo.git`,
                ssh_url: `git@github.com:${user.profile.login}/test-repo.git`,
                default_branch: 'main',
                owner: {
                    id: user.profile.id,
                    login: user.profile.login,
                    avatar_url: user.profile.avatar_url,
                    type: 'User',
                },
                permissions: {
                    admin: true,
                    maintain: true,
                    push: true,
                    triage: true,
                    pull: true,
                },
                archived: false,
                disabled: false,
                fork: false,
            },
            {
                id: 2,
                name: 'another-repo',
                full_name: `${user.profile.login}/another-repo`,
                description: 'Another test repository',
                private: true,
                html_url: `https://github.com/${user.profile.login}/another-repo`,
                clone_url: `https://github.com/${user.profile.login}/another-repo.git`,
                ssh_url: `git@github.com:${user.profile.login}/another-repo.git`,
                default_branch: 'main',
                owner: {
                    id: user.profile.id,
                    login: user.profile.login,
                    avatar_url: user.profile.avatar_url,
                    type: 'User',
                },
                permissions: {
                    admin: true,
                    maintain: true,
                    push: true,
                    triage: true,
                    pull: true,
                },
                archived: false,
                disabled: false,
                fork: false,
            },
        ]

        return json(mockRepos)
    }),
    http.get(
        'https://api.github.com/repos/:owner/:repo',
        async ({ params, request }) => {
            if (passthroughGitHub) return passthrough()

            const user = await getUser(request)
            if (user instanceof Response) return user

            // Mock single repository data
            const mockRepo = {
                id: 1,
                name: params.repo,
                full_name: `${params.owner}/${params.repo}`,
                description: `Mock repository ${params.repo}`,
                private: false,
                html_url: `https://github.com/${params.owner}/${params.repo}`,
                clone_url: `https://github.com/${params.owner}/${params.repo}.git`,
                ssh_url: `git@github.com:${params.owner}/${params.repo}.git`,
                default_branch: 'main',
                owner: {
                    id: user.profile.id,
                    login: user.profile.login,
                    avatar_url: user.profile.avatar_url,
                    type: 'User',
                },
                permissions: {
                    admin: true,
                    maintain: true,
                    push: true,
                    triage: true,
                    pull: true,
                },
                archived: false,
                disabled: false,
                fork: false,
            }

            return json(mockRepo)
        },
    ),
    http.post(
        'https://api.github.com/repos/:owner/:repo/issues',
        async ({ params, request }) => {
            if (passthroughGitHub) return passthrough()

            const user = await getUser(request)
            if (user instanceof Response) return user

            const issueData = (await request.json()) as any

            // Mock created issue response
            const mockIssue = {
                id: faker.number.int({ min: 1, max: 1000 }),
                number: faker.number.int({ min: 1, max: 100 }),
                title: issueData.title,
                body: issueData.body,
                html_url: `https://github.com/${params.owner}/${params.repo}/issues/${faker.number.int({ min: 1, max: 100 })}`,
                state: 'open',
                user: user.profile,
                repository_url: `https://api.github.com/repos/${params.owner}/${params.repo}`,
            }

            return json(mockIssue)
        },
    ),
    http.get(
        'https://api.github.com/repos/:owner/:repo/labels',
        async ({ request }) => {
            if (passthroughGitHub) return passthrough()

            const user = await getUser(request)
            if (user instanceof Response) return user

            // Mock labels
            const mockLabels = [
                {
                    id: 1,
                    name: 'bug',
                    color: 'd73a49',
                    description: "Something isn't working",
                    default: true,
                },
                {
                    id: 2,
                    name: 'enhancement',
                    color: 'a2eeef',
                    description: 'New feature or request',
                    default: true,
                },
                {
                    id: 3,
                    name: 'documentation',
                    color: '0075ca',
                    description: 'Improvements or additions to documentation',
                    default: true,
                },
            ]

            return json(mockLabels)
        },
    ),
    http.get(
        'https://api.github.com/repos/:owner/:repo/milestones',
        async ({ params, request }) => {
            if (passthroughGitHub) return passthrough()

            const user = await getUser(request)
            if (user instanceof Response) return user

            // Mock milestones
            const mockMilestones = [
                {
                    id: 1,
                    number: 1,
                    title: 'v1.0.0',
                    description: 'First major release',
                    state: 'open',
                    html_url: `https://github.com/${params.owner}/${params.repo}/milestone/1`,
                    due_on: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ]

            return json(mockMilestones)
        },
    ),
    http.get(
        'https://api.github.com/repos/:owner/:repo/collaborators',
        async ({ request }) => {
            if (passthroughGitHub) return passthrough()

            const user = await getUser(request)
            if (user instanceof Response) return user

            // Mock collaborators (just return the current user)
            const mockCollaborators = [user.profile]

            return json(mockCollaborators)
        },
    ),
]

