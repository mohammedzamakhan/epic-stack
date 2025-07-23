import { http, HttpResponse } from 'msw'
import { fixtures } from './fixtures'

/**
 * MSW handlers for mocking external API calls
 */
export const handlers = [
  // Slack API handlers
  http.post('https://slack.com/api/oauth.v2.access', () => {
    return HttpResponse.json(fixtures.slack.oauthResponse)
  }),

  http.get('https://slack.com/api/conversations.list', () => {
    return HttpResponse.json(fixtures.slack.channelsResponse)
  }),

  http.post('https://slack.com/api/chat.postMessage', () => {
    return HttpResponse.json(fixtures.slack.postMessageResponse)
  }),

  // Jira API handlers
  http.post('https://auth.atlassian.com/oauth/token', () => {
    return HttpResponse.json(fixtures.jira.oauthResponse)
  }),

  http.get('https://api.atlassian.com/me', () => {
    return HttpResponse.json(fixtures.jira.currentUserResponse)
  }),

  http.get('https://api.atlassian.com/oauth/token/accessible-resources', () => {
    return HttpResponse.json(fixtures.jira.accessibleResourcesResponse)
  }),

  http.get('https://api.atlassian.com/ex/jira/:cloudId/rest/api/3/project/search', () => {
    return HttpResponse.json(fixtures.jira.projectsResponse)
  }),

  http.get('https://api.atlassian.com/ex/jira/:cloudId/rest/api/3/project/:projectKey', () => {
    return HttpResponse.json(fixtures.jira.projectResponse)
  }),

  http.get('https://api.atlassian.com/ex/jira/:cloudId/rest/api/3/issue/createmeta', () => {
    return HttpResponse.json(fixtures.jira.createMetaResponse)
  }),

  http.post('https://api.atlassian.com/ex/jira/:cloudId/rest/api/3/issue', () => {
    return HttpResponse.json(fixtures.jira.createIssueResponse)
  }),

  // Error handlers for testing error scenarios
  http.post('https://slack.com/api/oauth.v2.access', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('code') === 'error_code') {
      return HttpResponse.json(fixtures.slack.oauthErrorResponse, { status: 400 })
    }
    return HttpResponse.json(fixtures.slack.oauthResponse)
  }),

  http.post('https://auth.atlassian.com/oauth/token', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('code') === 'error_code') {
      return HttpResponse.json(fixtures.jira.oauthErrorResponse, { status: 400 })
    }
    return HttpResponse.json(fixtures.jira.oauthResponse)
  }),
]

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = [
  // Network errors
  http.post('https://slack.com/api/oauth.v2.access', () => {
    return HttpResponse.error()
  }),

  http.post('https://auth.atlassian.com/oauth/token', () => {
    return HttpResponse.error()
  }),

  // Rate limiting errors
  http.get('https://slack.com/api/conversations.list', () => {
    return HttpResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 }
    )
  }),

  // Authentication errors
  http.get('https://api.atlassian.com/ex/jira/:cloudId/rest/api/3/project/search', () => {
    return HttpResponse.json(
      { errorMessages: ['Unauthorized'] },
      { status: 401 }
    )
  }),
]