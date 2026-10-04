// Sayfa build edildikten sonra GitHub'a eklenen/güncellenen repoları tarayıcıda yakalar.
// Liste değişmediyse DOM'a dokunulmaz. Yanıt 10 dk önbelleklenir (GitHub limiti: IP başına saatte 60 istek).
import type { Lang } from '../config';
import { fetchRepos, renderRepoGrid, reposSignature, type Repo } from '../lib/github';

const CACHE_KEY = 'gh-repos';
const TTL = 10 * 60 * 1000;

async function loadRepos(): Promise<Repo[]> {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null') as { at: number; repos: Repo[] } | null;
    if (cached && Date.now() - cached.at < TTL) return cached.repos;
  } catch {
    // önbellek okunamazsa ağdan çek
  }
  const repos = await fetchRepos();
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), repos }));
  } catch {
    // yazılamazsa sorun değil
  }
  return repos;
}

async function refresh() {
  const grid = document.querySelector<HTMLElement>('.repo-grid');
  if (!grid) return;
  try {
    const repos = await loadRepos();
    if (reposSignature(repos) === grid.dataset.sig) return;
    grid.innerHTML = renderRepoGrid(repos, grid.dataset.lang as Lang);
    grid.dataset.sig = reposSignature(repos);
    const count = document.querySelector('[data-repo-count]');
    if (count) count.textContent = String(repos.length);
  } catch {
    // GitHub'a ulaşılamazsa build sırasındaki liste kalır
  }
}

// Açılış animasyonunu yavaşlatmamak için tarayıcı boştayken çalıştır
if ('requestIdleCallback' in window) requestIdleCallback(refresh, { timeout: 3000 });
else setTimeout(refresh, 1500);
