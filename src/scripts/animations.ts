// GSAP animasyonları. Performans kuralları:
// - Yalnızca transform ve opacity animasyonu (filter/blur/box-shadow animasyonu yok)
// - Aynı öğede çakışan tween yok: kaydırma, fare ve süzülme ayrı iç içe katmanlarda
// - Fare için her olayda yeni tween yerine quickTo + requestAnimationFrame
// - İlk ekran görünmüyorken sonsuz animasyonlar duraklatılır
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

if (reduced) root.classList.remove('anim');
else run();

function run() {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // ─── AÇILIŞ ───
  // fromTo başlangıç durumunu hemen uygular; ardından CSS'teki gizleme sınıfı kaldırılabilir
  gsap
    .timeline({ defaults: { ease: 'power3.out' }, delay: 0.1 })
    .fromTo('.header > *', { y: -20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.07 })
    .fromTo('.wave-glow', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, '-=.5')
    .fromTo('.wave-float', { x: 120, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.4 }, '-=1.2')
    .fromTo('.bg-text', { autoAlpha: 0, scale: 1.1 }, { autoAlpha: 1, scale: 1, duration: 1.4 }, '-=1.2')
    .fromTo('.hero .eyebrow', { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 }, '-=1')
    .fromTo(
      '.title .word',
      { yPercent: 110, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.9, stagger: 0.05, ease: 'power4.out' },
      '-=.8',
    )
    .fromTo('.title-desc', { x: -10, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.6 }, '-=.5')
    .fromTo(
      '.paren',
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(2)' },
      '-=.45',
    )
    .fromTo('.avatar-group', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.7)' }, '-=.3')
    .fromTo(
      '.icon-tile',
      { scale: 0, rotation: -45, autoAlpha: 0 },
      { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.7)' },
      '-=.4',
    )
    .fromTo('.future-tag', { x: -10, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5 }, '-=.3')
    .fromTo(
      '.badge-float',
      { scale: 0, rotation: -90, autoAlpha: 0 },
      { scale: 1, rotation: 0, autoAlpha: 1, duration: 0.8, ease: 'back.out(1.7)' },
      '-=.5',
    )
    .fromTo('.res-item', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.08 }, '-=.4');

  gsap.set('.reveal', { y: 50, autoAlpha: 0 });
  root.classList.remove('anim');

  // ─── SÜREKLİ (yumuşak) HAREKETLER ───
  const loop = { repeat: -1, yoyo: true, ease: 'sine.inOut' } as const;
  const loops = [
    gsap.to('.wave-float', { y: -18, rotation: -1.2, duration: 5.5, ...loop }),
    gsap.to('.wave-glow.a', { y: 12, scale: 1.05, duration: 6, ...loop }),
    gsap.to('.wave-glow.b', { y: -16, x: -10, duration: 7, ...loop }),
    gsap.to('.badge-float', { y: 8, duration: 3.5, ...loop }),
    gsap.to('.icon-tile svg', { rotation: 12, duration: 4, transformOrigin: '50% 50%', ...loop }),
    gsap.to('.avatar-group img', { rotation: 3, duration: 3, ...loop }),
  ];

  // İlk ekran görünmüyorsa sonsuz animasyonları (CSS olanlar dahil) durdur
  let introVisible = true;
  const intro = document.querySelector('.intro');
  if (intro) {
    new IntersectionObserver(([entry]) => {
      introVisible = entry.isIntersecting;
      loops.forEach((t) => (introVisible ? t.resume() : t.pause()));
      root.classList.toggle('fx-paused', !introVisible);
    }).observe(intro);
  }

  // ─── KAYDIRMA PARALAKSI ───
  const scrub = (end: number, amount = 1.2) => ({ trigger: 'body', start: 'top top', end: `+=${end}`, scrub: amount });
  gsap.to('.wave-scroll', { scrollTrigger: scrub(1200), y: -240, rotation: 6, scale: 1.08 });
  gsap.to('.bg-text-wrap', { scrollTrigger: scrub(1000), xPercent: -8, opacity: 0.5 });
  gsap.to('.badge', { scrollTrigger: scrub(800, 1.5), y: 80, rotation: 30 });

  // ─── KAYDIRINCA BELİRME ───
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out', overwrite: true }),
  });

  if (finePointer) pointerEffects(() => introVisible);
}

function pointerEffects(isIntroVisible: () => boolean) {
  // Fare paralaksı: her katman tek quickTo, olaylar kare başına bire indirgenir
  const waveX = gsap.quickTo('.wave-mouse', 'x', { duration: 1.2, ease: 'power3.out' });
  const glowX = gsap.quickTo('.glow-mouse', 'x', { duration: 1.4, ease: 'power3.out' });
  const glowY = gsap.quickTo('.glow-mouse', 'y', { duration: 1.4, ease: 'power3.out' });
  const textX = gsap.quickTo('.bg-text', 'x', { duration: 1.4, ease: 'power3.out' });

  // Kart eğme: setter'lar kart başına bir kez oluşturulur (GitHub'dan sonradan gelen kartlar da çalışır)
  type Tilt = { rx: gsap.QuickToFunc; ry: gsap.QuickToFunc };
  const tilts = new WeakMap<HTMLElement, Tilt>();
  const tiltOf = (card: HTMLElement): Tilt => {
    let t = tilts.get(card);
    if (!t) {
      gsap.set(card, { transformPerspective: 900 });
      t = {
        rx: gsap.quickTo(card, 'rotateX', { duration: 0.5, ease: 'power2.out' }),
        ry: gsap.quickTo(card, 'rotateY', { duration: 0.5, ease: 'power2.out' }),
      };
      tilts.set(card, t);
    }
    return t;
  };

  let frame = 0;
  let last: PointerEvent | null = null;
  let activeCard: HTMLElement | null = null;

  const update = () => {
    frame = 0;
    const e = last!;
    if (isIntroVisible()) {
      const x = e.clientX / innerWidth - 0.5;
      const y = e.clientY / innerHeight - 0.5;
      waveX(x * 30);
      glowX(x * 60);
      glowY(y * 40);
      textX(x * -20);
    }

    const card = (e.target as Element | null)?.closest?.<HTMLElement>('.clay-card') ?? null;
    if (activeCard && activeCard !== card) {
      const t = tiltOf(activeCard);
      t.rx(0);
      t.ry(0);
    }
    activeCard = card;
    if (card) {
      const r = card.getBoundingClientRect();
      const t = tiltOf(card);
      t.ry(((e.clientX - r.left) / r.width - 0.5) * 4);
      t.rx(-((e.clientY - r.top) / r.height - 0.5) * 4);
    }
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      last = e;
      frame ||= requestAnimationFrame(update);
    },
    { passive: true },
  );

  // Mıknatıs etkili butonlar
  document.querySelectorAll<HTMLElement>('.header-cta').forEach((btn) => {
    const bx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
    const by = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      bx(((e.clientX - r.left) / r.width - 0.5) * 6);
      by(((e.clientY - r.top) / r.height - 0.5) * 6);
    });
    btn.addEventListener('pointerleave', () => {
      bx(0);
      by(0);
    });
  });
}
