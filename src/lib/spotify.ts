// /api/now-playing yanıtının şekli — Worker (worker/index.ts) ve tarayıcı aynı tipi kullanır
export type NowPlaying =
  | { isPlaying: false }
  | {
      isPlaying: true;
      title: string;
      artist: string;
      image: string | null;
      url: string;
      /** Yanıtın gönderildiği andaki konum */
      progressMs: number;
      durationMs: number;
    };
