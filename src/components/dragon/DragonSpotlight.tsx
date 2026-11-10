import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DragonSprite as BaseSprite, type DragonSpriteProps } from './DragonSprite';
import { ACTIVE_DRAGON_SKIN } from '../../data/dragon/skins';

const DragonSprite: React.FC<DragonSpriteProps> = (p) => <BaseSprite skin={ACTIVE_DRAGON_SKIN} {...p} />;
import type { DragonTier } from '../../data/dragon/tiers';
import type { TourStep } from '../../engine/dragon/tours';

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 6;
const BLUR = 'fixed bg-slate-950/55 backdrop-blur-[3px]';
const DRAGON = 76;
const GROUP_MAX_W = 360;
const GAP = 30;

/** Elemen pertama yang cocok dan benar-benar tampil (bukan di tab/modal tersembunyi). */
export function findTarget(selector: string): Element | null {
  for (const el of Array.from(document.querySelectorAll(selector))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

/** Posisi target di layar (null = tidak ada, tersembunyi, atau di luar layar). */
export function measureTarget(selector: string): Rect | null {
  const el = findTarget(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return null;
  return rectOf(el);
}

interface DragonSpotlightProps {
  step: TourStep;
  /** Nomor langkah (1-based) dan total; total > 1 menampilkan "Langkah n/N". */
  stepNo: number;
  stepTotal: number;
  tier: DragonTier;
  /** Langkah selesai (target diketuk, atau tombol info ditekan). */
  onAdvance: () => void;
  onCancel: () => void;
}

/**
 * Sorotan naga: seluruh layar di-blur kecuali elemen target (empat panel blur mengelilingi "lubang").
 *  - command : lubang berisi tombol transparan; mengetuknya menjalankan perintah naga.
 *  - click   : lubang terbuka; ketukan diteruskan ke elemen asli, lalu tur lanjut.
 *  - info    : lubang terbuka (mis. kanvas tetap bisa dipakai) + tombol lanjut di balon.
 */
export const DragonSpotlight: React.FC<DragonSpotlightProps> = ({ step, stepNo, stepTotal, tier, onAdvance, onCancel }) => {
  const reduce = useReducedMotion();
  const [rect, setRect] = useState<Rect | null>(() => measureTarget(step.selector));
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const kind = step.action.kind;

  const remeasure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    setRect(measureTarget(step.selector));
  }, [step.selector]);

  // Target tidak utuh di area aman (tertutup header / navigasi bawah, atau di luar layar) → gulir ke tengah dulu.
  // Elemen fixed (mis. tombol navigasi) tidak ikut bergulir, jadi aman dipanggil untuk semua target.
  useLayoutEffect(() => {
    const el = findTarget(step.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      const safeTop = 72;
      const safeBottom = window.innerHeight - 96;
      if (r.top < safeTop || r.bottom > safeBottom) el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    remeasure();
  }, [step.selector, remeasure, reduce]);

  useEffect(() => {
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    const t = window.setInterval(remeasure, 400); // tata letak bergeser (lazy load, animasi modal)
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
      clearInterval(t);
    };
  }, [remeasure]);

  // Langkah "click": tunggu pemain mengetuk elemen aslinya (ketukan tetap diproses elemen itu).
  useEffect(() => {
    if (kind !== 'click') return;
    const onClick = (e: MouseEvent) => {
      const el = findTarget(step.selector);
      if (el && e.target instanceof Node && el.contains(e.target)) window.setTimeout(onAdvance, 0);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [kind, step.selector, onAdvance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Target hilang cukup lama (mis. pemain menutup modal): hentikan tur.
  useEffect(() => {
    if (rect) return;
    const t = window.setTimeout(() => { if (!findTarget(step.selector)) onCancel(); }, 1500);
    return () => clearTimeout(t);
  }, [rect, step.selector, onCancel]);

  if (!rect) return null;

  // Naga + balon di sisi yang ruangnya lebih lega (atas / bawah target).
  const spaceAbove = rect.top;
  const spaceBelow = vp.h - (rect.top + rect.height);
  const above = spaceAbove > spaceBelow;
  const room = Math.max(120, (above ? spaceAbove : spaceBelow) - GAP - 12);
  const groupW = Math.min(GROUP_MAX_W, vp.w - 24);
  const cx = rect.left + rect.width / 2;
  const left = Math.max(12, Math.min(cx - groupW / 2, vp.w - groupW - 12));
  // Target hampir sebesar layar: tak ada ruang di atas/bawahnya, jadi balon ditempel di bawah layar (di atas navigasi).
  const docked = room < 200;
  const groupStyle: React.CSSProperties = docked
    ? { left, bottom: 84, width: groupW, maxHeight: Math.round(vp.h * 0.5) }
    : above
      ? { left, bottom: Math.max(12, vp.h - rect.top + GAP), width: groupW, maxHeight: room }
      : { left, top: Math.min(vp.h - 140, rect.top + rect.height + GAP), width: groupW, maxHeight: room };
  const arrowLeft = Math.max(rect.left + 4, Math.min(cx - 12, rect.left + rect.width - 28));
  const Arrow = above ? ChevronDown : ChevronUp;
  const bottomOf = rect.top + rect.height;
  const rightOf = rect.left + rect.width;
  const multi = stepTotal > 1;

  return createPortal(
    <div className="fixed inset-0 z-[9985] pointer-events-none" role="dialog" aria-label={`${tier.name} menunjukkan ${step.label}`}>
      {/* Empat panel blur di sekitar lubang; mengetuknya menghentikan sorotan. */}
      <div className={`${BLUR} pointer-events-auto`} style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} onClick={onCancel} />
      <div className={`${BLUR} pointer-events-auto`} style={{ top: bottomOf, left: 0, right: 0, bottom: 0 }} onClick={onCancel} />
      <div className={`${BLUR} pointer-events-auto`} style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }} onClick={onCancel} />
      <div className={`${BLUR} pointer-events-auto`} style={{ top: rect.top, left: rightOf, right: 0, height: rect.height }} onClick={onCancel} />

      {/* Bingkai berdenyut */}
      <motion.div
        className="fixed rounded-2xl border-2 border-gold"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        animate={reduce ? {} : { boxShadow: ['0 0 0 0 rgba(240,190,82,0.55)', '0 0 0 10px rgba(240,190,82,0)'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
      />
      {kind === 'command' && (
        <button
          type="button"
          onClick={onAdvance}
          aria-label={`Buka ${step.label}`}
          className="fixed rounded-2xl cursor-pointer bg-transparent pointer-events-auto"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}

      {/* Panah ke target (disembunyikan saat balon ditempel di bawah layar) */}
      {!docked && <motion.div
        className="fixed text-gold"
        style={above ? { left: arrowLeft, top: rect.top - 28 } : { left: arrowLeft, top: bottomOf + 4 }}
        animate={reduce ? {} : { y: above ? [0, 5, 0] : [0, -5, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Arrow className="w-6 h-6 stroke-[3]" />
      </motion.div>}

      {/* Naga + balon teks */}
      <motion.div
        key={stepNo}
        className={`fixed flex gap-2 pointer-events-auto ${above || docked ? 'items-end' : 'items-start'}`}
        style={groupStyle}
        initial={{ opacity: 0, y: above ? 12 : -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="shrink-0" style={{ width: DRAGON, height: DRAGON }}>
          <DragonSprite tier={tier} mood={kind === 'info' ? 'talking' : 'pointing'} size={DRAGON} />
        </div>
        <div className="flex-1 min-w-0 max-h-full overflow-y-auto rounded-2xl panel border border-border-subtle shadow-2xl p-3 space-y-2">
          {multi && (
            <p className="text-[10px] font-mono tracking-wider text-gold">{step.chapter ? `${step.chapter.toUpperCase()} · ` : ''}LANGKAH {stepNo}/{stepTotal}</p>
          )}
          <p className="text-sm text-text-primary font-body leading-snug">{step.text}</p>
          {step.points?.length ? (
            <ul className="space-y-1">
              {step.points.map(pt => (
                <li key={pt} className="flex gap-1.5 text-xs text-text-secondary font-body leading-snug">
                  <span className="text-gold shrink-0">•</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex gap-1.5">
            {kind === 'command' && (
              <button type="button" onClick={onAdvance} className="flex-1 py-1.5 rounded-xl btn-physical-primary text-xs font-bold cursor-pointer">
                Buka {step.label}
              </button>
            )}
            {kind === 'info' && (
              <button type="button" onClick={onAdvance} className="flex-1 py-1.5 rounded-xl btn-physical-primary text-xs font-bold cursor-pointer">
                {step.action.kind === 'info' && step.action.button ? step.action.button : stepNo < stepTotal ? 'Lanjut' : 'Selesai'}
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className={`${kind === 'click' ? 'flex-1' : ''} px-3 py-1.5 rounded-xl bg-surface-card border border-border-subtle text-xs font-bold text-text-secondary cursor-pointer`}
            >
              {multi ? 'Berhenti' : 'Nanti'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
