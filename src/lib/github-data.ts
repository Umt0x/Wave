// Build sırasında GitHub verisini bir kez çeker; iki dil sayfası aynı sonucu paylaşır.
import { profile } from '../config';
import { fetchRepos, fetchUser, type GitHubUser, type Repo } from './github';

export interface GitHubData {
  repos: Repo[];
  user: GitHubUser;
}

let cache: Promise<GitHubData> | undefined;

export function getGitHubData(): Promise<GitHubData> {
  cache ??= (async () => {
    const token = import.meta.env.GITHUB_TOKEN as string | undefined;
    const [repos, user] = await Promise.allSettled([fetchRepos(token), fetchUser(token)]);
    if (repos.status === 'rejected') console.warn('[github] repolar alınamadı:', repos.reason);
    if (user.status === 'rejected') console.warn('[github] profil alınamadı:', user.reason);
    return {
      repos: repos.status === 'fulfilled' ? repos.value : [],
      user:
        user.status === 'fulfilled'
          ? user.value
          : { avatarUrl: `https://github.com/${profile.github}.png`, publicRepos: 0, followers: 0 },
    };
  })();
  return cache;
}
