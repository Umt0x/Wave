// Görünen bölüme göre menüdeki aktif öğeyi işaretler (scroll olayı yerine IntersectionObserver: maliyetsiz)
const targets: [string, Element | null][] = [
  ['top', document.querySelector('.hero')],
  ['about', document.getElementById('about')],
  ['projects', document.getElementById('projects')],
  ['contact', document.getElementById('contact')],
];
const links = document.querySelectorAll<HTMLAnchorElement>('[data-section]');
const visible = new Set<string>();

const observer = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const id = targets.find(([, el]) => el === e.target)?.[0];
      if (!id) continue;
      if (e.isIntersecting) visible.add(id);
      else visible.delete(id);
    }
    // Ekranın ortasındaki bölümlerden en alttaki aktif; hiçbiri yoksa son durum korunur
    const current = [...targets].reverse().find(([id]) => visible.has(id))?.[0];
    if (current) links.forEach((a) => a.classList.toggle('active', a.dataset.section === current));
  },
  { rootMargin: '-45% 0px -45% 0px' },
);

for (const [, el] of targets) if (el) observer.observe(el);
