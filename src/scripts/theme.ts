const root = document.documentElement;
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

const effectiveTheme = () => root.dataset.theme ?? (darkQuery.matches ? 'dark' : 'light');

document.querySelector('.theme-btn')?.addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    // gizli sekme vb. — tema yine de bu oturumda uygulanır
  }
});
