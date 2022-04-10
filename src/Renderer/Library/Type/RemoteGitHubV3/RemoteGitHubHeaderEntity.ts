export type RemoteGitHubHeaderEntity = {
  gheVersion: string | null;
  scopes: Array<'repo' | 'notifications' | 'read:org' | string>;
  fulfillRateLimit: boolean;
}
