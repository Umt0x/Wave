// Spotify'da bir şey çalıyorsa kartı gösterir. Sekme arka plandayken sorgu yapılmaz;
// ilerleme çubuğu JS döngüsü yerine tek bir CSS geçişiyle akar (kasma yok).
import type { NowPlaying } from '../lib/spotify';

const card = document.querySelector<HTMLAnchorElement>('[data-spotify]');
const POLL_MS = 20_000;
let timer: ReturnType<typeof setTimeout> | undefined;
let unavailable = false;

function schedule(ms: number) {
  clearTimeout(timer);
  timer = setTimeout(update, ms);
}

function render(card: HTMLAnchorElement, np: NowPlaying) {
  if (!np.isPlaying) {
    card.hidden = true;
    return;
  }
  const img = card.querySelector<HTMLImageElement>('.sp-art')!;
  if (np.image && img.src !== np.image) img.src = np.image;
  card.href = np.url;
  card.querySelector('.sp-title')!.textContent = np.title;
  card.querySelector('.sp-artist')!.textContent = np.artist;
  card.setAttribute('aria-label', `Spotify: ${np.title} — ${np.artist}`);

  const bar = card.querySelector<HTMLElement>('.sp-bar > span')!;
  const remaining = Math.max(np.durationMs - np.progressMs, 0);
  bar.style.transition = 'none';
  bar.style.transform = `scaleX(${np.durationMs ? np.progressMs / np.durationMs : 0})`;
  card.hidden = false;
  void bar.offsetWidth; // başlangıç değerini uygula, sonra geçişi başlat
  bar.style.transition = `transform ${remaining}ms linear`;
  bar.style.transform = 'scaleX(1)';
}

async function update() {
  if (!card || unavailable || document.hidden) return;
  let np: NowPlaying;
  try {
    const res = await fetch('/api/now-playing', { cache: 'no-store' });
    // API yoksa (ör. `astro dev`) sessizce vazgeç
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
      unavailable = true;
      return;
    }
    np = (await res.json()) as NowPlaying;
  } catch {
    schedule(POLL_MS * 3);
    return;
  }
  render(card, np);
  // Şarkı bitince hemen yenisini göster
  const next = np.isPlaying ? Math.min(POLL_MS, Math.max(np.durationMs - np.progressMs + 1500, 3000)) : POLL_MS;
  schedule(next);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(timer);
  else update();
});

if ('requestIdleCallback' in window) requestIdleCallback(update, { timeout: 2500 });
else setTimeout(update, 1200);
