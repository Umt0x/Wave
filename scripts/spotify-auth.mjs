// Tek seferlik: Spotify hesabına izin verip SPOTIFY_REFRESH_TOKEN alır ve .dev.vars dosyasına yazar.
// Kullanım: önce .dev.vars içine SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET yaz, sonra `npm run spotify:auth`.
import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';

const VARS_FILE = '.dev.vars';
const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = 'user-read-currently-playing';

function readVars() {
  if (!existsSync(VARS_FILE)) return {};
  return Object.fromEntries(
    readFileSync(VARS_FILE, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2]]),
  );
}

function writeVar(key, value) {
  const text = existsSync(VARS_FILE) ? readFileSync(VARS_FILE, 'utf8') : '';
  const line = `${key}="${value}"`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  writeFileSync(VARS_FILE, re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`.trimStart());
}

const { SPOTIFY_CLIENT_ID: clientId, SPOTIFY_CLIENT_SECRET: clientSecret } = readVars();
if (!clientId || !clientSecret) {
  console.error(`
${VARS_FILE} içinde SPOTIFY_CLIENT_ID ve SPOTIFY_CLIENT_SECRET bulunamadı.

1. https://developer.spotify.com/dashboard adresinde bir uygulama oluştur
2. Redirect URI olarak tam şunu ekle: ${REDIRECT_URI}
3. .dev.vars.example dosyasını .dev.vars olarak kopyala, Client ID ve Secret'ı yaz
4. Bu komutu tekrar çalıştır`);
  process.exit(1);
}

const state = randomBytes(12).toString('hex');
const authUrl =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({ response_type: 'code', client_id: clientId, scope: SCOPE, redirect_uri: REDIRECT_URI, state });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', REDIRECT_URI);
  if (url.pathname !== '/callback') return res.writeHead(404).end();

  const reply = (msg) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(msg);
    server.close();
  };
  if (url.searchParams.get('state') !== state) return reply('Güvenlik kontrolü başarısız (state). Tekrar dene.');
  const code = url.searchParams.get('code');
  if (!code) return reply(`Spotify izni verilmedi: ${url.searchParams.get('error')}`);

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
  });
  const json = await tokenRes.json();
  if (!json.refresh_token) {
    console.error('Token alınamadı:', json);
    return reply('Token alınamadı, terminale bak.');
  }

  writeVar('SPOTIFY_REFRESH_TOKEN', json.refresh_token);
  console.log(`
✔ SPOTIFY_REFRESH_TOKEN ${VARS_FILE} dosyasına yazıldı.

Yerelde denemek için:   npm run preview:cf
Yayındaki siteye eklemek için (her biri değeri sorar, .dev.vars'tan kopyala):
  npx wrangler secret put SPOTIFY_CLIENT_ID
  npx wrangler secret put SPOTIFY_CLIENT_SECRET
  npx wrangler secret put SPOTIFY_REFRESH_TOKEN`);
  reply('Tamam! Bu sekmeyi kapatıp terminale dönebilirsin.');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Tarayıcıda Spotify izin sayfası açılıyor. Açılmazsa bu adresi kopyala:\n\n${authUrl}\n`);
  const opener = process.platform === 'win32' ? `start "" "${authUrl}"` : process.platform === 'darwin' ? `open "${authUrl}"` : `xdg-open "${authUrl}"`;
  exec(opener);
});
