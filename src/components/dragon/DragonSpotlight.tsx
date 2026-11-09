import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DragonSprite } from './DragonSprite';
import type { DragonTier } from '../../data/dragon/tiers';
import type { GuideTarget } from '../../engine/dragon/guideTarget';

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 6;
const BLUR = 'fixed bg-slate-950/55 backdrop-blur-[3px]';
const DRAGON = 84;
const BUBBLE_W = 240;

/** Posisi elemen target (null = tidak ada / tidak terlihat). */
export function measureTarget(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

interface DragonSpotlightProps {
  target: GuideTarget;
  tier: DragonTier;
  /** Pemain mengetuk elemen yang disorot. */
  onGo: () => void;
  onCancel: () => void;
}

/**
 * Sorotan naga: seluruh layar di-blur kecuali elemen target (empat panel blur mengelilingi "lubang").
 * Naga berdiri di dekat target dengan balon teks; mengetuk target menjalankan tindakan.
 */
export const DragonSpotlight: React.FC<DragonSpotlightProps> = ({ target, tier, onGo, onCancel }) => {
  const reduce = useReducedMotion();
  const [rect, setRect] = useState<Rect | null>(() => measureTarget(target.selector));
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  const remeasure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    setRect(measureTarget(target.selector));
  }, [target.selector]);

  useLayoutEffect(remeasure, [remeasure]);

  useEffect(() => {
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    const t = window.setInterval(remeasure, 500); // tata letak bergeser (lazy load, animasi tab)
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
      clearInterval(t);
    };
  }, [remeasure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onGo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onGo]);

  // Target hilang (mis. tata letak berubah): batalkan.
  useEffect(() => {
    if (!rect) {
      const t = window.setTimeout(() => { if (!measureTarget(target.selector)) onCancel(); }, 300);
      return () => clearTimeout(t);
    }
  }, [rect, target.selector, onCancel]);

  if (!rect) return null;

  // Naga + balon di atas target bila target di separuh bawah layar, selain itu di bawahnya.
  const above = rect.top + rect.height / 2 > vp.h / 2;
  const groupW = Math.min(BUBBLE_W + DRAGON, vp.w - 24);
  const cx = rect.left + rect.width / 2;
  const left = Math.max(12, Math.min(cx - groupW / 2, vp.w - groupW - 12));
  const groupStyle: React.CSSProperties = above
    ? { left, bottom: vp.h - rect.top + 30, width: groupW }
    : { left, top: rect.top + rect.height + 30, width: groupW };
  const arrowLeft = Math.max(rect.left + 4, Math.min(cx - 12, rect.left + rect.width - 28));
  const Arrow = above ? ChevronDown : ChevronUp;

  const bottomOf = rect.top + rect.height;
  const rightOf = rect.left + rect.width;

  return createPortal(
    <div className="fixed inset-0 z-[46]" role="dialog" aria-modal="true" aria-label={`${tier.name} menunjukkan ${target.label}`}>
      {/* Empat panel blur di sekitar lubang; mengetuknya membatalkan. */}
      <div className={BLUR} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} onClick={onCancel} />
      <div className={BLUR} style={{ top: bottomOf, left: 0, right: 0, bottom: 0 }} onClick={onCancel} />
      <div className={BLUR} style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} onClick={onCancel} />
      <div className={BLUR} style={{ top: rect.top, left: rightOf, right: 0, height: rect.height }} onClick={onCancel} />

      {/* Bingkai berdenyut + tombol transparan di atas target */}
      <motion.div
        className="fixed rounded-2xl border-2 border-gold pointer-events-none"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        animate={reduce ? {} : { boxShadow: ['0 0 0 0 rgba(240,190,82,0.55)', '0 0 0 10px rgba(240,190,82,0)'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      />
      <button
        type="button"
        onClick={onGo}
        aria-label={`Buka ${target.label}`}
        className="fixed rounded-2xl cursor-pointer bg-transparent"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      />

      {/* Panah ke target */}
      <motion.div
        className="fixed text-gold pointer-events-none"
        style={above ? { left: arrowLeft, top: rect.top - 28 } : { left: arrowLeft, top: bottomOf + 4 }}
        animate={reduce ? {} : { y: above ? [0, 5, 0] : [0, -5, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Arrow className="w-6 h-6 stroke-[3]" />
      </motion.div>

      {/* Naga + balon teks */}
      <motion.div
        className={`fixed flex gap-2 ${above ? 'items-end' : 'items-start'}`}
        style={groupStyle}
        initial={{ opacity: 0, y: above ? 12 : -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="shrink-0" style={{ width: DRAGON, height: DRAGON }}>
          <DragonSprite tier={tier} mood="pointing" size={DRAGON} />
        </div>
        <div className="flex-1 min-w-0 rounded-2xl panel border border-border-subtle shadow-2xl p-3 space-y-2">
          <p className="text-sm text-text-primary font-body leading-snug">
            Ketuk <strong className="text-gold">{target.label}</strong> di sini.{target.detail ? ` ${target.detail}` : ''}
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={onGo} className="flex-1 py-1.5 rounded-xl btn-physical-primary text-xs font-bold cursor-pointer">
              Buka
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-xs font-bold text-text-secondary cursor-pointer"
            >
              Nanti
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
