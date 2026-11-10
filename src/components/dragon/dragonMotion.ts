import type React from 'react';
import type { TargetAndTransition } from 'motion/react';

export type DragonMood = 'idle' | 'greeting' | 'thinking' | 'talking' | 'happy' | 'pointing' | 'evolving';

/** Titik putar dalam koordinat viewBox (0..120). */
export const pivot = (x: number, y: number): React.CSSProperties => ({ transformBox: 'view-box', transformOrigin: `${x}px ${y}px` });

export const loop = (duration: number, extra: Record<string, unknown> = {}) => ({ duration, repeat: Infinity, ease: 'easeInOut' as const, ...extra });

/**
 * Gerak tiap bagian tubuh per mood. Dipakai bersama oleh semua gaya naga supaya animasinya identik.
 * Titik putar: badan (60,112), kepala (60,64), sayap (40,70), ekor (82,98), lengan kanan (80,80).
 */
export function dragonMotion(mood: DragonMood, animated: boolean) {
  const root: TargetAndTransition = !animated ? {} : (() => {
    switch (mood) {
      case 'happy': return { y: [0, -9, 0, -5, 0], transition: loop(1.1, { repeatDelay: 0.5 }) };
      case 'greeting': return { rotate: [0, -4, 4, -2, 0], transition: loop(1.4, { repeatDelay: 0.6 }) };
      case 'talking': return { y: [0, -1.5, 0], transition: loop(0.5) };
      case 'pointing': return { rotate: 4, y: [0, -1.5, 0], transition: { rotate: { duration: 0.3 }, y: loop(2) } };
      case 'thinking': return { y: [0, -1, 0], transition: loop(2.4) };
      case 'evolving': return { scale: [1, 1.12, 0.97, 1.06, 1], transition: loop(1.6) };
      default: return { y: [0, -2, 0], transition: loop(3.2) };
    }
  })();

  const head: TargetAndTransition = !animated ? {} : mood === 'thinking'
    ? { rotate: [-9, -6, -9], transition: loop(2) }
    : mood === 'talking'
      ? { rotate: [0, 2, -1, 0], transition: loop(1.2) }
      : { rotate: 0 };

  const wingSpeed = mood === 'happy' || mood === 'greeting' || mood === 'evolving' ? 0.45 : 2.6;
  const wing: TargetAndTransition = animated ? { rotate: [0, -14, 0], transition: loop(wingSpeed) } : {};
  const wingR: TargetAndTransition = animated ? { rotate: [0, 14, 0], transition: loop(wingSpeed) } : {};

  const tail: TargetAndTransition = animated ? { rotate: [0, 8, 0, -4, 0], transition: loop(mood === 'happy' ? 0.8 : 2.8) } : {};

  const arm: TargetAndTransition = !animated
    ? (mood === 'pointing' ? { rotate: -75 } : {})
    : mood === 'greeting'
      ? { rotate: [-100, -135, -100, -135, -100], transition: loop(1.2, { repeatDelay: 0.8 }) }
      : mood === 'pointing'
        ? { rotate: [-72, -78, -72], transition: loop(1.4) }
        : mood === 'happy'
          ? { rotate: [-30, -60, -30], transition: loop(1.1, { repeatDelay: 0.5 }) }
          : { rotate: 0 };

  const blink: TargetAndTransition = animated && mood !== 'happy'
    ? { scaleY: [1, 1, 0.1, 1], transition: { duration: 4.2, repeat: Infinity, times: [0, 0.92, 0.96, 1] } }
    : {};

  const happyEyes = mood === 'happy' || mood === 'evolving';
  return { root, head, wing, wingR, tail, arm, blink, happyEyes };
}
