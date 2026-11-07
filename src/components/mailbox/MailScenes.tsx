import React, { useEffect, useRef, useState } from 'react';
import { useAnimate, useReducedMotion } from 'motion/react';
import { Stationery, stationeryStyle } from '../../lib/mailCore';

/**
 * Animasi Kotak Pos:
 * - PostScene: surat masuk amplop, amplop ditutup, lalu dimasukkan ke celah kotak pos.
 * - TakeScene: pintu kotak pos terbuka, amplop keluar, tutupnya dibuka, surat ditarik keluar.
 *
 * Panggung 240x320 px dengan koordinat tetap; kotak pos digambar dari div (tanpa gambar eksternal).
 * Menghormati prefers-reduced-motion (langsung selesai) dan bisa dilewati dengan ketukan (TakeScene).
 */

export type BoxVariant = 'red' | 'indigo';

const BOX_COLORS: Record<BoxVariant, { body: string; cap: string; door: string; dark: string; mark: string }> = {
  red: { body: '#c4473d', cap: '#a63a31', door: '#cf5348', dark: '#3a1513', mark: '#fde8e4' },
  indigo: { body: '#4a5ca6', cap: '#3c4c8c', door: '#5567b2', dark: '#161c36', mark: '#e4e8fb' },
};

// Geometri panggung (px).
const STAGE_W = 240;
const STAGE_H = 320;
const BOX = { left: 45, top: 120, w: 150, h: 190 };
const SLOT_Y = 170; // garis celah pada koordinat panggung
const DOOR = { left: 70, top: 204, w: 100, h: 80 };
const ENV = { left: 65, top: 100, w: 110, h: 70 }; // posisi dasar amplop (pusat 120,135)

const EASE = [0.22, 1, 0.36, 1] as const;

function wait(ms: number) {
  return new Promise(r => window.setTimeout(r, ms));
}

/** Badan kotak pos (tutup kubah, badan, celah, tanda 〒, kaki). */
function BoxBody({ variant, hidden }: { variant: BoxVariant; hidden?: boolean }) {
  const c = BOX_COLORS[variant];
  return (
    <div className="box absolute" style={{ left: BOX.left, top: BOX.top, width: BOX.w, height: BOX.h, opacity: hidden ? 0 : 1 }} aria-hidden="true">
      <div className="absolute left-0 top-0 w-full" style={{ height: 34, background: c.cap, borderRadius: '70px 70px 10px 10px' }} />
      <div className="absolute left-0 w-full rounded-b-2xl shadow-lg" style={{ top: 26, height: 154, background: c.body }} />
      <div className="absolute rounded-full" style={{ left: 30, top: 46, width: 90, height: 9, background: c.dark }} />
      <div
        className="absolute flex items-center justify-center font-black rounded-full"
        style={{ left: 63, top: 61, width: 24, height: 18, color: c.body, background: c.mark, fontSize: 13, lineHeight: 1 }}
      >
        〒
      </div>
      <div className="absolute rounded-b-md" style={{ left: 45, top: 180, width: 60, height: 10, background: c.dark }} />
    </div>
  );
}

/** Pintu depan kotak pos (berengsel di kiri). */
function BoxDoor({ variant, hidden }: { variant: BoxVariant; hidden?: boolean }) {
  const c = BOX_COLORS[variant];
  return (
    <div
      className="door absolute rounded-lg"
      style={{
        left: DOOR.left, top: DOOR.top, width: DOOR.w, height: DOOR.h,
        background: c.door, border: `2px solid ${c.dark}`, transformOrigin: 'left center', zIndex: 3, opacity: hidden ? 0 : 1,
      }}
      aria-hidden="true"
    >
      <div className="absolute rounded-full" style={{ right: 8, top: 34, width: 8, height: 8, background: c.dark }} />
      <div className="absolute left-3 right-6 rounded-full opacity-40" style={{ top: 12, height: 3, background: c.dark }} />
    </div>
  );
}

/** Amplop + surat di dalamnya. Urutan lapisan: punggung < tutup terbuka < surat < kantong < tutup tertutup. */
function Envelope({ stationery, flapOpen, start, letterStartY = 0 }: {
  stationery: Stationery;
  flapOpen: boolean;
  /** Transform awal amplop (sebelum animasi pertama berjalan). */
  start?: string;
  letterStartY?: number;
}) {
  const s = stationeryStyle(stationery);
  const lined = `repeating-linear-gradient(to bottom, transparent 0, transparent 9px, ${s.rule} 9px, ${s.rule} 10px), ${s.paper}`;
  return (
    <div
      className="env absolute"
      style={{ left: ENV.left, top: ENV.top, width: ENV.w, height: ENV.h, zIndex: 2, perspective: 500, transform: start }}
      aria-hidden="true"
    >
      {/* punggung amplop */}
      <div className="absolute inset-0 rounded-md shadow-xl" style={{ background: s.paper, border: `1px solid ${s.rule}`, filter: 'brightness(0.93)' }} />
      {/* surat (dipotong di tepi bawah amplop) */}
      <div className="absolute left-0 right-0 overflow-hidden" style={{ top: -230, height: 300, zIndex: 2 }}>
        <div
          className="letter absolute rounded-sm shadow-md"
          style={{ left: 10, top: 236, width: 90, height: 96, background: lined, border: `1px solid ${s.rule}`, transform: `translateY(${letterStartY}px)` }}
        >
          <div className="absolute left-2 right-8 rounded-full" style={{ top: 10, height: 3, background: s.muted, opacity: 0.6 }} />
          <div className="absolute left-2 right-3 rounded-full" style={{ top: 22, height: 2, background: s.muted, opacity: 0.35 }} />
          <div className="absolute left-2 right-5 rounded-full" style={{ top: 32, height: 2, background: s.muted, opacity: 0.35 }} />
          <div className="absolute left-2 right-4 rounded-full" style={{ top: 42, height: 2, background: s.muted, opacity: 0.35 }} />
        </div>
      </div>
      {/* kantong depan (V) */}
      <svg className="absolute inset-0" width={ENV.w} height={ENV.h} viewBox={`0 0 ${ENV.w} ${ENV.h}`} style={{ zIndex: 3 }}>
        <path d={`M0 16 L${ENV.w / 2} 46 L${ENV.w} 16 L${ENV.w} ${ENV.h} L0 ${ENV.h} Z`} fill={s.paper} stroke={s.rule} strokeWidth="1" />
        <path d={`M0 ${ENV.h} L${ENV.w / 2} 40 L${ENV.w} ${ENV.h}`} fill="none" stroke={s.rule} strokeWidth="1" />
      </svg>
      {/* tutup amplop */}
      <div
        className="flap absolute left-0 top-0"
        style={{
          width: ENV.w, height: 42, transformOrigin: 'top center',
          transform: flapOpen ? 'rotateX(180deg)' : 'rotateX(0deg)', zIndex: flapOpen ? 1 : 4,
        }}
      >
        <svg width={ENV.w} height={42} viewBox={`0 0 ${ENV.w} 42`}>
          <path d={`M0 0 L${ENV.w / 2} 40 L${ENV.w} 0 Z`} fill={s.paper} stroke={s.rule} strokeWidth="1" style={{ filter: 'brightness(0.97)' }} />
        </svg>
      </div>
    </div>
  );
}

function setZ(root: HTMLElement | null, selector: string, z: number) {
  const el = root?.querySelector<HTMLElement>(selector);
  if (el) el.style.zIndex = String(z);
}

// --------------------------- Memposkan ---------------------------

interface PostSceneProps {
  stationery: Stationery;
  variant?: BoxVariant;
  /** Hasil pengiriman ke server; animasi menunggu ini sebelum amplop masuk ke celah. */
  result: Promise<boolean>;
  /** Dipanggil sekali: true saat surat sudah masuk kotak pos, false bila gagal. */
  onDone: (ok: boolean) => void;
  /** Tampil di bawah kotak pos setelah surat diposkan (mis. tombol tutup). Kotak pos tetap terlihat. */
  footer?: React.ReactNode;
}

export const PostScene: React.FC<PostSceneProps> = ({ stationery, variant = 'red', result, onDone, footer }) => {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();
  const [caption, setCaption] = useState('Melipat surat…');
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let alive = true;
    const finish = (ok: boolean) => {
      if (alive) doneRef.current(ok);
    };
    (async () => {
      if (reduce) {
        const ok = await result;
        if (ok) setCaption('Surat sudah diposkan');
        finish(ok);
        return;
      }
      const root = scope.current;
      // 1. surat turun masuk ke amplop
      await animate('.letter', { y: [-150, 0] }, { duration: 0.6, ease: EASE });
      if (!alive) return;
      // 2. tutup amplop menutup (berganti lapisan saat tegak)
      await animate('.flap', { rotateX: [180, 90] }, { duration: 0.18, ease: 'easeIn' });
      setZ(root, '.flap', 4);
      await animate('.flap', { rotateX: [90, 0] }, { duration: 0.18, ease: 'easeOut' });
      if (!alive) return;
      setCaption('Membawa ke kotak pos…');
      // 3. kotak pos muncul, amplop mengecil ke atas celah
      await Promise.all([
        animate('.box, .door', { opacity: [0, 1], y: [30, 0] }, { duration: 0.45, ease: EASE }),
        animate('.env', { y: [70, 14], scale: [1, 0.6], rotate: [0, -4, 0] }, { duration: 0.6, ease: EASE }),
      ]);
      if (!alive) return;
      // 4. tunggu server
      const ok = await result;
      if (!alive) return;
      if (!ok) {
        await animate('.env', { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 });
        await animate('.env', { opacity: 0, y: 40 }, { duration: 0.3 });
        finish(false);
        return;
      }
      setCaption('Memasukkan ke kotak pos…');
      // 5. amplop masuk lewat celah (dipotong di garis celah)
      const clip = root?.querySelector<HTMLElement>('.clip');
      if (clip) clip.style.height = `${SLOT_Y}px`;
      await animate('.env', { y: [14, 80] }, { duration: 0.5, ease: [0.55, 0, 0.75, 0.2] });
      if (!alive) return;
      // 6. kotak pos "menelan"
      setCaption('Surat sudah diposkan');
      await animate('.box, .door', { scaleY: [1, 0.96, 1.02, 1], scaleX: [1, 1.03, 0.99, 1] }, { duration: 0.4, ease: 'easeOut' });
      if (!alive) return;
      finish(true);
      // 7. diam: kotak pos bergoyang pelan sampai pemain menutupnya
      await wait(250);
      if (!alive) return;
      animate('.box, .door', { y: [0, -5, 0], rotate: [0, -1.2, 0, 1.2, 0] }, { duration: 3.2, ease: 'easeInOut', repeat: Infinity });
    })();
    return () => {
      alive = false;
    };
  }, [animate, reduce, result, scope]);

  return (
    <div className="py-4 flex flex-col items-center gap-3 select-none" role="status" aria-live="polite">
      <div ref={scope} className="relative" style={{ width: STAGE_W, height: STAGE_H, perspective: 700 }}>
        <BoxBody variant={variant} hidden={!reduce} />
        {!reduce && (
          <div className="clip absolute left-0 top-0 overflow-hidden" style={{ width: STAGE_W, height: STAGE_H, zIndex: 2 }}>
            <Envelope stationery={stationery} flapOpen start="translateY(70px)" letterStartY={-150} />
          </div>
        )}
        <BoxDoor variant={variant} hidden={!reduce} />
      </div>
      <p className="text-sm font-bold font-heading text-text-primary">{caption}</p>
      {footer}
    </div>
  );
};

// --------------------------- Mengambil ---------------------------

interface TakeSceneProps {
  stationery: Stationery;
  variant?: BoxVariant;
  onDone: () => void;
}

export const TakeScene: React.FC<TakeSceneProps> = ({ stationery, variant = 'indigo', onDone }) => {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    doneRef.current();
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (reduce) {
        finish();
        return;
      }
      const root = scope.current;
      // 1. pintu kotak pos terbuka
      await animate('.door', { rotateY: [0, -112] }, { duration: 0.45, ease: EASE });
      if (!alive) return;
      // 2. amplop keluar dari kotak pos dan mendekat
      setZ(root, '.door', 1);
      await Promise.all([
        animate('.env', { y: [109, 0], scale: [0.5, 1] }, { duration: 0.55, ease: EASE }),
        animate('.box, .door', { opacity: [1, 0], y: [0, 40] }, { duration: 0.5, delay: 0.15, ease: 'easeIn' }),
      ]);
      if (!alive) return;
      // 3. tutup amplop dibuka
      await animate('.flap', { rotateX: [0, 90] }, { duration: 0.16, ease: 'easeIn' });
      setZ(root, '.flap', 1);
      await animate('.flap', { rotateX: [90, 180] }, { duration: 0.16, ease: 'easeOut' });
      if (!alive) return;
      // 4. surat ditarik keluar
      await animate('.letter', { y: [0, -110] }, { duration: 0.45, ease: EASE });
      if (!alive) return;
      await animate('.env', { opacity: [1, 0], scale: [1, 1.08] }, { duration: 0.2 });
      if (alive) finish();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, reduce, scope]);

  return (
    <button
      type="button"
      onClick={finish}
      className="w-full py-4 flex flex-col items-center gap-3 select-none"
      aria-label="Lewati animasi dan buka surat"
    >
      <div ref={scope} className="relative" style={{ width: STAGE_W, height: STAGE_H, perspective: 700 }}>
        <BoxBody variant={variant} />
        <Envelope stationery={stationery} flapOpen={false} start="translateY(109px) scale(0.5)" />
        <BoxDoor variant={variant} />
      </div>
      <span className="text-sm font-bold font-heading text-text-primary">Mengambil surat dari kotak pos…</span>
      <span className="text-[10px] text-text-muted">Ketuk untuk langsung membuka</span>
    </button>
  );
};
