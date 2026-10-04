# Wave

Astro + TypeScript ile yapılmış kişisel site şablonu: iki dil (TR/EN), açık/koyu tema, GitHub'dan otomatik
proje kartları, Spotify'da "şu an dinliyor" kartı ve doğum tarihine göre kendini güncelleyen yaş.
Cloudflare Workers üzerinde ücretsiz çalışır.

Canlı örnek: https://umut.umt0x.workers.dev

## Komutlar

| Komut                  | Ne yapar                                                        |
| ---------------------- | --------------------------------------------------------------- |
| `npm install`          | Bağımlılıkları kurar                                            |
| `npm run dev`          | Hızlı geliştirme: `localhost:4321` (Spotify API burada çalışmaz) |
| `npm run preview:cf`   | Build alır, Cloudflare ortamını yerelde açar: `localhost:8787`  |
| `npm run deploy`       | Build alır ve Cloudflare'e yayınlar                             |
| `npm run spotify:auth` | Spotify'a bir kez izin verip refresh token alır                 |
| `npm run wave`         | Dalga görselini yeniden üretir (`src/assets/wave.png`)           |
| `npx astro check`      | TypeScript kontrolü                                             |

## Kendine uyarlamak

- **Kişisel bilgiler** (ad, doğum tarihi, konum, GitHub kullanıcı adı, sosyal hesaplar): `src/config.ts`
- **Tüm metinler (TR + EN)**: `src/i18n/ui.ts`. Metindeki `{age}` yaşla değiştirilir.
- **Dalga görseli**: `scripts/generate-wave.mjs` içinde eğri, kıvrım sayısı ve renkler değiştirilip `npm run wave` ile yeniden çizilir.
- **Site adresi**: `astro.config.mjs` → `site`, Worker adı: `wrangler.jsonc` → `name`

### Yaş
`birthDate` alanından hesaplanır. Build sırasında yazılır ve ziyaretçinin tarayıcısında yeniden hesaplanır,
yani doğum gününde site yeniden yayınlanmasa da güncel yaş görünür.

### GitHub proje kartları
GitHub'daki açık repolar otomatik olarak kart olur: build sırasında çekilir, tarayıcıda da tekrar kontrol
edilir (10 dk önbellek). Fork'lar, arşivlenmiş repolar ve profil README reposu gizlenir. İki dilli açıklama
veya bir repoyu gizlemek için: `src/config.ts` → `repoOverrides`.

### Spotify "şu an dinliyor"
Kart yalnızca Spotify'da bir şey çalarken görünür. Anahtarlar tarayıcıya ve repoya girmez, Cloudflare
Worker'da (`worker/index.ts`) saklanır.

1. https://developer.spotify.com/dashboard adresinde bir uygulama oluştur.
   Redirect URI olarak tam olarak `http://127.0.0.1:8888/callback` ekle.
2. `.dev.vars.example` dosyasını `.dev.vars` olarak kopyala, Client ID ve Client Secret'ı yaz.
3. `npm run spotify:auth` komutunu çalıştır ve açılan sayfada izin ver. Refresh token `.dev.vars` dosyasına yazılır.
4. `npm run preview:cf` ile yerelde dene (Spotify'da bir şarkı aç).
5. Yayındaki site için üç değeri Cloudflare'e ekle:
   ```
   npx wrangler secret put SPOTIFY_CLIENT_ID
   npx wrangler secret put SPOTIFY_CLIENT_SECRET
   npx wrangler secret put SPOTIFY_REFRESH_TOKEN
   ```

## Yayınlama (Cloudflare Workers)

```
npx wrangler login
npm run deploy
```

Site `https://<name>.<hesap-alt-alanın>.workers.dev` adresinde açılır. Alternatif olarak repo Cloudflare
panelinden (Workers & Pages → Create → Import a repository) bağlanırsa her push'ta kendiliğinden yayınlanır.
Build komutu: `npm run build`, deploy komutu: `npx wrangler deploy`.

## Lisans

MIT — bkz. [LICENSE](LICENSE).

## Yapı

```
src/
  components/Home.astro   Sayfanın tamamı (dil parametresi alır)
  components/AgeText.astro {age} içeren metinleri yazar
  components/Icon.astro   Satır içi SVG ikonlar
  layouts/Base.astro      <head>, SEO etiketleri, tema
  pages/index.astro       Türkçe   →  /
  pages/en/index.astro    İngilizce →  /en/
  lib/github.ts           GitHub API + kart HTML'i (sunucu ve tarayıcı ortak)
  lib/age.ts              Yaş hesabı
  lib/spotify.ts          /api/now-playing yanıt tipi
  scripts/                Tarayıcı scriptleri (animasyon, tema, menü, repolar, Spotify, yaş)
  styles/global.css       Tüm stiller ve renk değişkenleri (açık/koyu)
worker/index.ts           Cloudflare Worker: statik site + /api/now-playing
scripts/spotify-auth.mjs  Tek seferlik Spotify izin aracı
scripts/generate-wave.mjs Dalga görselini matematiksel olarak çizer
```
