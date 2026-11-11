// SATU-SATUNYA tempat mengatur timestamp. Ubah durasi (detik) per scene di sini
// dan seluruh video ikut menyesuaikan.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const SCENES = [
  { id: "hook", sec: 3.5 },
  { id: "logo", sec: 4.5 },
  { id: "pillars", sec: 7 },
  { id: "loop", sec: 7 },
  { id: "world", sec: 7 },
  { id: "dungeon", sec: 7 },
  { id: "tiers", sec: 6 },
  { id: "extras", sec: 5 },
  { id: "cta", sec: 4 },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

let cursor = 0;
export const T = Object.fromEntries(
  SCENES.map((s) => {
    const from = cursor;
    const dur = Math.round(s.sec * FPS);
    cursor += dur;
    return [s.id, { from, dur }];
  }),
) as Record<SceneId, { from: number; dur: number }>;

export const TOTAL_FRAMES = cursor;
