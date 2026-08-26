import { GitLabProvider } from './packages/integrations/src/providers/gitlab/provider.ts';
const p = new GitLabProvider();
const int = { config: JSON.stringify({ instanceUrl: 'https://localtest.me:8000' }) } as any;
const res = p.getBaseUrl(int);
console.log('baseUrl:', res);
