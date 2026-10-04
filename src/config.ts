// Site genelindeki kişisel bilgiler. İçeriği değiştirmek için çoğunlukla burası ve src/i18n/ui.ts yeterli.

export type Lang = 'tr' | 'en';
export type Localized = Record<Lang, string>;

export const profile = {
  name: 'Umut',
  /** YYYY-AA-GG — yaş buradan otomatik hesaplanır */
  birthDate: '2006-12-30',
  location: 'İstanbul, Türkiye',
  github: 'Umt0x',
  // Diğer hesaplar eklenince buraya: { label: 'Instagram', url: 'https://…', icon: 'instagram' }
  socials: [{ label: 'GitHub', url: 'https://github.com/Umt0x', icon: 'github' }] as const,
};

export interface RepoOverride {
  /** Kartı tamamen gizle */
  hidden?: boolean;
  /** GitHub açıklaması tek dilli olduğu için iki dilli açıklama */
  description?: Localized;
}

// GitHub'daki her repo otomatik kart olur. Buradaki ayarlar yalnızca isteğe bağlı düzeltmeler içindir.
// Profil README reposu (Umt0x/Umt0x) ve fork'lar zaten otomatik gizlenir.
export const repoOverrides: Record<string, RepoOverride> = {
  Odo: {
    description: {
      tr: 'Cloudflare Workers üzerinde çalışan ziyaretçi sayacı.',
      en: 'A visitor counter running on Cloudflare Workers.',
    },
  },
  Fena: {
    description: { tr: 'Yapım aşamasında.', en: 'Work in progress.' },
  },
};
