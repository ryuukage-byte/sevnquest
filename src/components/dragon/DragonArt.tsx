import React, { useId } from 'react';
import { motion, useReducedMotion, type TargetAndTransition } from 'motion/react';
import { loop, pivot } from './dragonMotion';
import type { DragonMood } from './dragonMotion';
import type { DragonSpriteProps } from './DragonSprite';
import { ART_TIER_LOOKS } from '../../data/dragon/skins';
import bodyImg from '../../assets/dragon/tatsu-body.webp';
import wingLImg from '../../assets/dragon/tatsu-wing-l.webp';
import wingRImg from '../../assets/dragon/tatsu-wing-r.webp';
import tailImg from '../../assets/dragon/tatsu-tail.webp';

/**
 * Naga gaya 'image': ilustrasi milik pemilik, dianimasikan sebagai boneka potong (cut-out).
 *
 * Gambar dipecah menjadi 4 lapisan berukuran sama (512×512): badan, sayap kiri, sayap kanan, ekor.
 * Sayap dan ekor berputar di pangkalnya; badan "bernapas" dengan squash & stretch dari telapak kaki;
 * mata berkedip lewat kelopak yang digambar di atasnya. Semuanya transform/opacity saja (murah di GPU).
 * Filter (rona tier + tepi cahaya) dipasang di pembungkus HTML, bukan di dalam SVG, agar konsisten di Safari.
 */

// Semua koordinat di bawah dalam piksel aset (0..512).
const ASSET = 512;
const pct = (v: number) => `${(v / ASSET) * 100}%`;
const origin = (x: number, y: number) => `${pct(x)} ${pct(y)}`;
const PIVOT = { wingL: origin(197, 288), wingR: origin(376, 282), tail: origin(166, 432), feet: origin(256, 500) };

const HEAD_NAVY = '#353e59';
const LID_LINE = '#8f9ac0';
const EYE_L = 'M236 150 L262 137 L291 141 L306 165 L304 191 L286 207 L255 209 L235 196 L229 172 Z';
const EYE_R = 'M381 150 L392 139 L405 145 L412 165 L410 189 L398 199 L385 193 L379 172 Z';

const layer: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', userSelect: 'none' };

type Anim = TargetAndTransition;

/** Gerak per mood. `u` = piksel per satuan (ukuran/120), supaya lompatan sebanding di semua ukuran. */
function artMotion(mood: DragonMood, on: boolean, u: number) {
  const none: Anim = {};
  if (!on) {
    return {
      root: mood === 'pointing' ? { rotate: 5 } : mood === 'thinking' ? { rotate: -4 } : none,
      squash: none, wingL: none, wingR: none, tail: none,
    };
  }
  const flap = (deg: number, dur: number, delay = 0) => ({
    wingL: { rotate: [0, deg, -deg * 0.25, 0], transition: loop(dur, { delay }) } as Anim,
    wingR: { rotate: [0, -deg, deg * 0.25, 0], transition: loop(dur, { delay }) } as Anim,
  });
  const wag = (deg: number, dur: number): Anim => ({ rotate: [0, deg, 0, -deg * 0.6, 0], transition: loop(dur) });
  const breathe = (amt: number, dur: number): Anim => ({ scaleY: [1, 1 + amt, 1], scaleX: [1, 1 - amt * 0.6, 1], transition: loop(dur) });

  switch (mood) {
    case 'happy': {
      // Lompat dua kali: memipih sebelum melompat, memanjang di udara, memipih saat mendarat.
      const t = { duration: 1.2, repeat: Infinity, repeatDelay: 0.35, times: [0, 0.12, 0.38, 0.55, 0.68, 0.84, 1], ease: 'easeInOut' as const };
      return {
        root: { y: [0, 0, -13 * u, 0, -6 * u, 0, 0], transition: t },
        squash: { scaleY: [1, 0.9, 1.07, 0.92, 1.04, 0.96, 1], scaleX: [1, 1.07, 0.95, 1.06, 0.97, 1.03, 1], transition: t },
        ...flap(16, 0.32), tail: wag(9, 0.7),
      };
    }
    case 'greeting':
      return {
        root: { rotate: [0, -6, 5, -3, 0], y: [0, -3 * u, 0, -2 * u, 0], transition: loop(1.3, { repeatDelay: 0.5 }) },
        squash: breathe(0.03, 0.65), ...flap(14, 0.4), tail: wag(8, 0.9),
      };
    case 'talking':
      return {
        root: { y: [0, -2 * u, 0], rotate: [0, 1.5, 0, -1, 0], transition: loop(0.9) },
        squash: breathe(0.03, 0.45), ...flap(6, 1.6), tail: wag(4, 2.2),
      };
    case 'thinking':
      return {
        root: { rotate: [-5, -3, -5], transition: loop(2.4) },
        squash: breathe(0.018, 3.2), ...flap(4, 3.4), tail: wag(7, 1.6),
      };
    case 'pointing':
      return {
        root: { rotate: [5, 7, 5], x: [0, 2.5 * u, 0], y: [0, -2 * u, 0], transition: loop(1.1) },
        squash: breathe(0.025, 1.1), ...flap(9, 0.8), tail: wag(6, 1.4),
      };
    case 'evolving':
      return {
        root: { scale: [1, 1.12, 0.97, 1.06, 1], transition: loop(1.6) },
        squash: breathe(0.03, 0.8), ...flap(18, 0.3), tail: wag(10, 0.6),
      };
    default:
      return {
        root: { y: [0, -1.5 * u, 0], transition: loop(3.2) },
        squash: breathe(0.022, 3.2), ...flap(7, 2.8, 0.4), tail: wag(5, 3.6),
      };
  }
}

export const DragonArt: React.FC<DragonSpriteProps> = ({ tier, mood = 'idle', size = 96, className, still }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !still && !reduce;
  const t = tier.index;
  const look = ART_TIER_LOOKS[Math.min(Math.max(t, 0), ART_TIER_LOOKS.length - 1)];
  const showAura = t >= 4 || mood === 'evolving';
  const auraGrad = `da-aura-${uid}`;
  const m = artMotion(mood, animated, size / 120);

  // Badan navy nyaris menyatu dengan latar navy aplikasi: tepi cahaya tipis menjaga siluetnya.
  const rimPx = Math.max(0.5, size / 150);
  const filter = `${look.filter} drop-shadow(0 0 ${rimPx}px ${look.accent}) drop-shadow(0 0 ${rimPx * 2.4}px ${look.accent}99)`.trim();

  const eyesClosed = mood === 'happy' || mood === 'evolving';
  const blink: Anim = eyesClosed
    ? { opacity: 1 }
    : animated
      ? { opacity: [0, 0, 1, 1, 0], transition: { duration: 4.4, repeat: Infinity, times: [0, 0.93, 0.945, 0.975, 1] } }
      : { opacity: 0 };

  return (
    <div className={className} role="img" aria-label={`Naga ${tier.name}`} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Belakang: aura, cincin evolusi, bayangan */}
      <svg viewBox="0 0 120 120" style={{ ...layer, overflow: 'visible' }} aria-hidden="true">
        <defs>
          <radialGradient id={auraGrad} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={look.accent} stopOpacity={0.45} />
            <stop offset="100%" stopColor={look.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
        {showAura && (
          <motion.circle
            cx={60} cy={66} r={58} fill={`url(#${auraGrad})`}
            animate={animated ? { opacity: mood === 'evolving' ? [0.6, 1, 0.6] : [0.45, 0.8, 0.45] } : { opacity: 0.65 }}
            transition={loop(mood === 'evolving' ? 0.9 : 3.5)}
          />
        )}
        {mood === 'evolving' && animated && (
          <motion.circle
            cx={60} cy={66} fill="none" stroke={look.accent} strokeWidth={2.5}
            initial={{ r: 20, opacity: 0.9 }}
            animate={{ r: [20, 60], opacity: [0.9, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        {/* Bayangan mengecil saat naga melompat */}
        <motion.ellipse
          cx={60} cy={115} rx={27} ry={4} fill="#000"
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          animate={animated && mood === 'happy'
            ? { scale: [1, 1, 0.7, 1, 0.85, 1, 1], opacity: [0.28, 0.28, 0.16, 0.28, 0.22, 0.28, 0.28] }
            : { scale: 1, opacity: 0.28 }}
          transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.35, times: [0, 0.12, 0.38, 0.55, 0.68, 0.84, 1] }}
        />
      </svg>

      {/* Naga: seluruh badan → squash & stretch → lapisan */}
      <motion.div animate={m.root} style={{ ...layer, transformOrigin: PIVOT.feet, filter }}>
        <motion.div animate={m.squash} style={{ position: 'absolute', left: '1.67%', top: 0, width: '96.67%', height: '96.67%', transformOrigin: PIVOT.feet }}>
          <motion.img src={tailImg} alt="" draggable={false} animate={m.tail} style={{ ...layer, transformOrigin: PIVOT.tail }} />
          <motion.img src={wingLImg} alt="" draggable={false} animate={m.wingL} style={{ ...layer, transformOrigin: PIVOT.wingL }} />
          <motion.img src={wingRImg} alt="" draggable={false} animate={m.wingR} style={{ ...layer, transformOrigin: PIVOT.wingR }} />
          <img src={bodyImg} alt="" draggable={false} style={layer} />
          {/* Kelopak mata: kedip berkala; tertutup melengkung saat senang */}
          <motion.svg viewBox="0 0 512 512" style={layer} animate={blink} initial={{ opacity: eyesClosed ? 1 : 0 }} aria-hidden="true">
            <path d={EYE_L} fill={HEAD_NAVY} />
            <path d={EYE_R} fill={HEAD_NAVY} />
            <g fill="none" stroke={LID_LINE} strokeWidth={5} strokeLinecap="round">
              {eyesClosed ? (
                <>
                  <path d="M242 186 Q268 156 296 184" />
                  <path d="M384 180 Q396 158 408 178" />
                </>
              ) : (
                <>
                  <path d="M242 176 Q268 196 296 176" />
                  <path d="M384 172 Q396 188 408 172" />
                </>
              )}
            </g>
          </motion.svg>
        </motion.div>
      </motion.div>

      {/* Depan: halo, titik berpikir, garis suara */}
      <svg viewBox="0 0 120 120" style={{ ...layer, overflow: 'visible' }} aria-hidden="true">
        {t >= 6 && (
          <motion.ellipse
            cx={62} cy={3} rx={17} ry={4} fill="none" stroke={look.accent} strokeWidth={2.6}
            animate={animated ? { y: [0, -2, 0] } : {}}
            transition={loop(2.6)}
          />
        )}
        {mood === 'thinking' && [0, 1, 2].map(i => (
          <motion.circle
            key={i}
            cx={98 + i * 7} cy={22 - i * 6} r={2.4 + i * 0.6}
            fill="#e6e0d8" stroke="#0e1226" strokeWidth={1}
            animate={animated ? { opacity: [0.2, 1, 0.2], y: [0, -1.5, 0] } : { opacity: 1 }}
            transition={loop(1.2, { delay: i * 0.2 })}
          />
        ))}
        {mood === 'talking' && (
          <g fill="none" stroke="#e6e0d8" strokeWidth={1.8} strokeLinecap="round">
            {[0, 1].map(i => (
              <motion.path
                key={i}
                d={i === 0 ? 'M99 44 q4 4 0 9' : 'M105 40 q7 8 0 17'}
                animate={animated ? { opacity: [0.15, 1, 0.15] } : { opacity: 0.9 }}
                transition={loop(0.7, { delay: i * 0.18 })}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};

interface DragonArtEggProps {
  size?: number;
  cracks?: number;
  wobble?: boolean;
}

/** Telur Tatsu: navy dengan sabetan perak seperti corak di badannya. */
export const DragonArtEgg: React.FC<DragonArtEggProps> = ({ size = 96, cracks = 0, wobble = true }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const fast = cracks > 0;
  const EGG = 'M60 14 C82 14 96 50 96 74 C96 96 80 110 60 110 C40 110 24 96 24 74 C24 50 38 14 60 14 Z';
  const body = `de-body-${uid}`;
  const silver = `de-silver-${uid}`;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Telur naga" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={body} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2f3a68" />
          <stop offset="60%" stopColor="#1e2647" />
          <stop offset="100%" stopColor="#12162e" />
        </radialGradient>
        <linearGradient id={silver} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f2ee" />
          <stop offset="100%" stopColor="#a9acb5" />
        </linearGradient>
      </defs>
      <ellipse cx={60} cy={113} rx={24} ry={4} fill="#000" opacity={0.28} />
      <motion.g
        style={{ ...pivot(60, 110), filter: 'drop-shadow(0 0 0.6px #c9d2e6) drop-shadow(0 0 1.6px #c9d2e699)' }}
        animate={wobble && !reduce ? { rotate: fast ? [0, -9, 9, -6, 0] : [0, -4, 4, 0] } : {}}
        transition={{ duration: fast ? 0.5 : 1.2, repeat: Infinity, repeatDelay: fast ? 0.4 : 1.8 }}
      >
        <path d={EGG} fill={`url(#${body})`} stroke="#0e1226" strokeWidth={2} />
        {/* Sabetan perak */}
        <path d="M52 26 C62 34 68 46 66 60 C60 50 54 42 46 38 C50 35 52 31 52 26 Z" fill={`url(#${silver})`} />
        <path d="M34 72 C44 70 54 74 60 84 C50 80 42 80 34 84 C36 80 36 76 34 72 Z" fill={`url(#${silver})`} />
        <path d="M86 70 C80 78 72 82 62 100 C74 96 82 90 88 80 C86 77 86 73 86 70 Z" fill={`url(#${silver})`} opacity={0.9} />
        <path d="M43 30 Q47 23 54 20" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {cracks >= 1 && <path d="M60 38 L55 47 L62 53 L57 62" fill="none" stroke="#f4f2ee" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
        {cracks >= 2 && <path d="M62 53 L72 57 L76 66" fill="none" stroke="#f4f2ee" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
        {cracks >= 3 && <path d="M29 66 L39 61 L45 69 L54 63 L61 71 L71 65 L79 71 L91 65" fill="none" stroke="#f4f2ee" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      </motion.g>
    </svg>
  );
};
