// Hem build sırasında (Astro) hem tarayıcıda çalışır; Node'a özgü API kullanmayın.
import { profile, repoOverrides, type Lang } from '../config';

export interface Repo {
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  pushedAt: string;
}

export interface GitHubUser {
  avatarUrl: string;
  publicRepos: number;
  followers: number;
}

interface ApiRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

const API = 'https://api.github.com';

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export function normalizeRepos(raw: ApiRepo[]): Repo[] {
  return raw
    .filter(
      (r) =>
        !r.fork &&
        !r.archived &&
        r.name.toLowerCase() !== profile.github.toLowerCase() &&
        !repoOverrides[r.name]?.hidden,
    )
    .map((r) => ({
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics ?? [],
      pushedAt: r.pushed_at,
    }))
    .sort((a, b) => b.pushedAt.localeCompare(a.pushedAt));
}

export async function fetchRepos(token?: string): Promise<Repo[]> {
  const res = await fetch(`${API}/users/${profile.github}/repos?per_page=100&sort=pushed`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`GitHub repos: ${res.status}`);
  return normalizeRepos((await res.json()) as ApiRepo[]);
}

export async function fetchUser(token?: string): Promise<GitHubUser> {
  const res = await fetch(`${API}/users/${profile.github}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`GitHub user: ${res.status}`);
  const u = (await res.json()) as { avatar_url: string; public_repos: number; followers: number };
  return { avatarUrl: u.avatar_url, publicRepos: u.public_repos, followers: u.followers };
}

/** Repo listesinin değişip değişmediğini anlamak için kısa imza */
export function reposSignature(repos: Repo[]): string {
  return repos.map((r) => `${r.name}:${r.pushedAt}:${r.stars}:${r.description ?? ''}`).join('|');
}

export function languagesOf(repos: Repo[]): string[] {
  const count = new Map<string, number>();
  for (const r of repos) if (r.language) count.set(r.language, (count.get(r.language) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l);
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Lua: '#000080',
  'C#': '#178600',
  'C++': '#f34b7d',
  C: '#555555',
  Go: '#00add8',
  Rust: '#dea584',
  Java: '#b07219',
  Kotlin: '#a97bff',
  Swift: '#f05138',
  PHP: '#4f5d95',
  HTML: '#e34c26',
  CSS: '#663399',
  Shell: '#89e051',
  Astro: '#ff5a03',
  Vue: '#41b883',
};

export const langColor = (l: string) => LANG_COLORS[l] ?? 'var(--mute)';

const ui = {
  tr: { noDesc: 'Henüz açıklama eklenmedi.', live: 'Canlı', source: 'Kaynak', updated: 'Güncellendi' },
  en: { noDesc: 'No description yet.', live: 'Live', source: 'Source', updated: 'Updated' },
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const ICONS = {
  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  external:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  globe:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/></svg>',
};

export function repoDescription(repo: Repo, lang: Lang): string {
  return repoOverrides[repo.name]?.description?.[lang] ?? repo.description ?? ui[lang].noDesc;
}

/** Tek kaynak: hem sunucuda hem tarayıcıda aynı kart HTML'i üretilir */
export function renderRepoCard(repo: Repo, lang: Lang): string {
  const t = ui[lang];
  const date = new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric' }).format(new Date(repo.pushedAt));
  const tags: string[] = [];
  if (repo.language)
    tags.push(
      `<span class="tag"><span class="lang-dot" style="background:${langColor(repo.language)}"></span>${esc(repo.language)}</span>`,
    );
  if (repo.stars) tags.push(`<span class="tag">${ICONS.star}${repo.stars}</span>`);
  tags.push(`<span class="tag" title="${t.updated}">${ICONS.clock}${esc(date)}</span>`);
  if (repo.homepage)
    tags.push(
      `<a class="tag tag-link" href="${esc(repo.homepage)}" target="_blank" rel="noopener">${ICONS.globe}${t.live}</a>`,
    );

  return `<article class="clay-card repo-card" data-repo="${esc(repo.name)}">
  <div class="head">
    <span class="icon" aria-hidden="true">${ICONS.folder}</span>
    <h3>${esc(repo.name)}</h3>
    <a class="card-link" href="${esc(repo.url)}" target="_blank" rel="noopener" aria-label="${t.source}: ${esc(repo.name)}">${ICONS.external}</a>
  </div>
  <p>${esc(repoDescription(repo, lang))}</p>
  <div class="tag-row">${tags.join('')}</div>
</article>`;
}

export function renderRepoGrid(repos: Repo[], lang: Lang): string {
  return repos.map((r) => renderRepoCard(r, lang)).join('');
}
