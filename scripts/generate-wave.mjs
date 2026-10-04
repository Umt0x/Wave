// Kahraman bölümündeki dalga şeridini matematiksel olarak çizer ve src/assets/wave.png olarak kaydeder.
// Bir merkez eğrisi boyunca kıvrılan (twist) bir şerit: her dilimin genişliği cos(açı) ile daralır,
// ön/arka yüz farklı renklenir, ışık açısına göre gölgelenir. Çıktı statik bir görsel olduğu için
// sitede hiçbir çalışma maliyeti yoktur. Yeniden üretmek için: node scripts/generate-wave.mjs
import sharp from 'sharp';

const W = 2000;
const H = 1354;
const SEGMENTS = 1100; // eğri boyunca dilim sayısı
const LANES = 40; // genişlik boyunca şerit sayısı (yuvarlak, 3B görünüm için)
const TWISTS = 2.6; // toplam kıvrım sayısı

// Merkez eğrisi: sol alttan sağ üste kavisli bir kübik Bezier
const P = [
  [0.02 * W, 1.05 * H],
  [0.46 * W, 0.88 * H],
  [0.8 * W, 0.74 * H],
  [0.97 * W, -0.08 * H],
];

const bez = (t) => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
};
const bezD = (t) => {
  const u = 1 - t;
  const a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
  return [
    a * (P[1][0] - P[0][0]) + b * (P[2][0] - P[1][0]) + c * (P[3][0] - P[2][0]),
    a * (P[1][1] - P[0][1]) + b * (P[2][1] - P[1][1]) + c * (P[3][1] - P[2][1]),
  ];
};

// Renk durakları (t: eğri boyunca konum) — buzlu açık mavi → camgöbeği → koyu mavi
const FRONT = [
  [0, [236, 249, 253]],
  [0.3, [168, 232, 242]],
  [0.55, [70, 205, 222]],
  [0.78, [52, 150, 240]],
  [1, [28, 80, 235]],
];
const BACK = [
  [0, [190, 226, 242]],
  [0.3, [96, 190, 224]],
  [0.55, [32, 150, 205]],
  [0.78, [26, 92, 220]],
  [1, [14, 46, 180]],
];

const lerp = (a, b, k) => a + (b - a) * k;
function ramp(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return c0.map((v, j) => lerp(v, c1[j], k));
    }
  }
  return stops.at(-1)[1];
}

const halfWidth = (t) => W * (0.014 + 0.085 * Math.pow(t, 1.4));
const twist = (t) => 2 * Math.PI * TWISTS * Math.pow(t, 0.85) + 0.4;

// Örnek noktalar. Şeridin kesiti 3B'de (normal N, derinlik Z) düzleminde döner;
// kamera hafif eğik baktığı için Z bileşeninin bir kısmı eğri yönünde (T) görünür → yumuşak kıvrımlar.
const TILT = 0.38;
const pts = [];
for (let i = 0; i <= SEGMENTS; i++) {
  const t = i / SEGMENTS;
  const [x, y] = bez(t);
  const [dx, dy] = bezD(t);
  const len = Math.hypot(dx, dy);
  pts.push({ t, x, y, tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len, th: twist(t), w: halfWidth(t) });
}

// Kesit üzerinde u ∈ [-1, 1] konumundaki noktanın ekran izdüşümü
// (kesit hafif kavisli: genişlik boyunca açı biraz değişir → yuvarlak görünüm)
const BEND = 0.45;
const at = (p, u) => {
  const th = p.th + u * BEND * 0.5;
  const a = Math.cos(th) * p.w * u, z = Math.sin(th) * p.w * u;
  return [p.x + p.nx * a + p.tx * z * TILT, p.y + p.ny * a + p.ty * z * TILT];
};

// Işık: sol üst önden. Blinn-Phong gölgelendirme.
const L = [0.42, -0.25, 0.87]; // [N, T, Z] uzayında
const Ln = Math.hypot(...L);
const Lv = L.map((v) => v / Ln);
const Hv = [Lv[0], Lv[1], Lv[2] + 1];
const Hn = Math.hypot(...Hv);
const Hh = Hv.map((v) => v / Hn);

const f = (n) => n.toFixed(1);
const polys = [];
for (let i = 0; i < SEGMENTS; i++) {
  const a = pts[i], b = pts[i + 1];
  for (let l = 0; l < LANES; l++) {
    const u0 = -1 + (2 * l) / LANES, u1 = -1 + (2 * (l + 1)) / LANES;
    const th = a.th + ((u0 + u1) / 2) * BEND * 0.5;
    // Yüzey normali (N, T, Z); izleyiciye dönük tarafa çevir
    const facing = Math.cos(th) >= 0 ? 1 : -1;
    const n = [-Math.sin(th) * facing, 0, Math.cos(th) * facing];
    const diffuse = Math.max(0, n[0] * Lv[0] + n[1] * Lv[1] + n[2] * Lv[2]);
    const spec = Math.pow(Math.max(0, n[0] * Hh[0] + n[1] * Hh[1] + n[2] * Hh[2]), 48);
    const base = ramp(facing > 0 ? FRONT : BACK, a.t);
    const k = 0.5 + 0.6 * diffuse;
    const col = base.map((v) => Math.round(Math.min(255, v * k + 255 * spec * 0.75)));
    const q = [at(a, u0), at(a, u1), at(b, u1), at(b, u0)];
    const d = `M${f(q[0][0])} ${f(q[0][1])}L${f(q[1][0])} ${f(q[1][1])}L${f(q[2][0])} ${f(q[2][1])}L${f(q[3][0])} ${f(q[3][1])}Z`;
    const fill = `rgb(${col.join(',')})`;
    polys.push(`<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="1.1"/>`);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${polys.join('\n  ')}
</svg>`;

// Yumuşak gölge: şeridin kendi siluetini bulanıklaştırıp aşağı kaydırarak altına koy (statik, çalışma maliyeti yok)
const ribbon = await sharp(Buffer.from(svg)).png().toBuffer();
const alpha = await sharp(ribbon).extractChannel('alpha').blur(30).linear(0.2, 0).toBuffer();
const shadow = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 20, g: 70, b: 160 } } })
  .joinChannel(alpha)
  .png()
  .toBuffer();

const out = process.argv[2] ?? 'src/assets/wave.png';
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: await sharp(shadow).extract({ left: 0, top: 0, width: W, height: H - 40 }).toBuffer(), top: 40, left: 0 },
    { input: ribbon, top: 0, left: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(out);

// İsteğe bağlı önizleme: açık ve koyu zemin üzerinde
if (process.argv[3]) {
  for (const [name, bg] of [['light', '#ececef'], ['dark', '#0c0d11']]) {
    const flat = await sharp({ create: { width: W, height: H, channels: 3, background: bg } })
      .composite([{ input: out }])
      .png()
      .toBuffer();
    await sharp(flat).resize(1000).jpeg().toFile(`${process.argv[3]}-${name}.jpg`);
  }
}
console.log(`✔ dalga üretildi (${W}×${H}, ${polys.length} parça) → ${out}`);
