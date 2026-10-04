// Cloudflare Worker: statik siteyi sunar + /api/now-playing ile Spotify'da çalan şarkıyı döner.
// Spotify anahtarları yalnızca burada (Cloudflare secret) durur; tarayıcıya ve repoya hiç girmez.
import type { NowPlaying } from '../src/lib/spotify';

interface Env {
  ASSETS: Fetcher;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
}

interface SpotifyImage {
  url: string;
  width: number | null;
}

interface CurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: string;
  item: {
    name: string;
    duration_ms: number;
    external_urls: { spotify: string };
    artists?: { name: string }[];
    album?: { images: SpotifyImage[] };
    images?: SpotifyImage[];
    show?: { name: string };
  } | null;
}

// Aynı Worker örneği içinde kısa süreli bellek önbelleği (Spotify limitlerini korur)
let token: { value: string; expiresAt: number } | undefined;
let cached: { data: NowPlaying; at: number } | undefined;
const CACHE_MS = 10_000;

async function getAccessToken(env: Env): Promise<string> {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN! }),
  });
  if (!res.ok) throw new Error(`Spotify token: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return token.value;
}

function pickImage(images: SpotifyImage[] = []): string | null {
  // Spotify görselleri büyükten küçüğe sıralar; 52px kart için ~300px yeterli (retina dahil)
  return (images.find((i) => (i.width ?? 0) <= 320) ?? images.at(-1))?.url ?? null;
}

async function fetchNowPlaying(env: Env): Promise<NowPlaying> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) return { isPlaying: false };

  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode', {
    headers: { Authorization: `Bearer ${await getAccessToken(env)}` },
  });
  if (res.status === 204 || !res.ok) return { isPlaying: false };

  const data = (await res.json()) as CurrentlyPlaying;
  const item = data.item;
  if (!data.is_playing || !item) return { isPlaying: false };

  return {
    isPlaying: true,
    title: item.name,
    artist: item.artists?.map((a) => a.name).join(', ') ?? item.show?.name ?? '',
    image: pickImage(item.album?.images ?? item.images),
    url: item.external_urls.spotify,
    progressMs: data.progress_ms ?? 0,
    durationMs: item.duration_ms,
  };
}

async function nowPlaying(env: Env): Promise<NowPlaying> {
  const now = Date.now();
  if (!cached || now - cached.at > CACHE_MS) {
    try {
      cached = { data: await fetchNowPlaying(env), at: now };
    } catch (err) {
      console.error(err);
      cached = { data: { isPlaying: false }, at: now };
    }
  }
  const { data, at } = cached;
  // Önbellekten dönerken ilerlemeyi geçen süre kadar ileri al
  if (!data.isPlaying) return data;
  return { ...data, progressMs: Math.min(data.progressMs + (now - at), data.durationMs) };
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/now-playing') {
      return Response.json(await nowPlaying(env), {
        headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
