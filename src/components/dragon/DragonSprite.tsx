import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { DragonTier } from '../../data/dragon/tiers';
import type { DragonSkin } from '../../data/dragon/skins';

import type { DragonMood } from './dragonMotion';

export type { DragonMood };

export interface DragonSpriteProps {
  tier: DragonTier;
  mood?: DragonMood;
  size?: number;
  className?: string;
  /** Matikan semua gerak berulang (mis. pratinjau kecil di daftar tier). */
  still?: boolean;
  /** Gaya visual (palet + tekstur). Tanpa skin: palet tier, gradasi halus. */
  skin?: DragonSkin;
}

import { dragonMotion, loop, pivot } from './dragonMotion';
import { DragonInk } from './DragonInk';

/**
 * Naga chibi berbasis SVG: satu gambar, bagian tubuh dianimasikan terpisah dengan motion.
 * Perbedaan tier = palet + aksesori (tanduk, duri, kumis, permata, halo). Tanpa aset gambar.
 */
/** Gaya "ink" (Tinta Sumi) punya ilustrasi sendiri; gaya lain memakai gambar dasar dengan palet/tekstur. */
export const DragonSprite: React.FC<DragonSpriteProps> = (props) =>
  props.skin?.finish === 'ink' ? <DragonInk {...props} /> : <DragonClassic {...props} />;

const DragonClassic: React.FC<DragonSpriteProps> = ({ tier, mood = 'idle', size = 96, className, still, skin }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !still && !reduce;
  const sp = skin?.palette;
  const p = sp ?? tier.palette;
  const t = tier.index;
  const finish = skin?.finish;
  // "metal" & "pixel": bidang dipahat dua nada seperti bilah logo (batas tajam di tengah, bukan gradasi halus).
  const faceted = finish === 'metal' || finish === 'pixel';
  const hornShade = sp?.hornShade ?? p.horn;
  const cheek = sp ? sp.cheek : '#ff8f8f';
  const edge = sp?.trim ?? p.outline;
  const lineW = finish === 'ink' ? 2.6 : finish === 'lacquer' ? 2.2 : 2;

  const bodyGrad = `dg-body-${uid}`;
  const auraGrad = `dg-aura-${uid}`;
  const hornGrad = `dg-horn-${uid}`;
  const wingGrad = `dg-wing-${uid}`;
  const glossGrad = `dg-gloss-${uid}`;
  const inkFilter = `dg-ink-${uid}`;

  const { root, head, wing, wingR, tail, arm, blink, happyEyes } = dragonMotion(mood, animated);
  const showAura = t >= 4 || mood === 'evolving';

  // ------------------------------------------------------------------ bagian tubuh
  const hornLen = 6 + 16 * tier.horn;
  const hornTipX = 40 - hornLen * 0.45;
  const hornTipY = 25 - hornLen;
  const Horn = (
    <path
      d={`M41 28 Q${hornTipX - 1} ${hornTipY + hornLen * 0.55} ${hornTipX} ${hornTipY} Q${hornTipX + 7} ${hornTipY + hornLen * 0.5} 51 23 Z`}
      fill={faceted || finish === 'lacquer' ? `url(#${hornGrad})` : p.horn}
      stroke={p.outline}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  );

  const Wing = (
    <g transform={`translate(40 70) scale(${tier.wing}) translate(-40 -70)`}>
      <path
        d="M40 70 C30 55 16 51 7 55 C13 59 13 64 11 68 C17 66 21 69 21 74 C27 72 31 74 35 80 Z"
        fill={faceted ? `url(#${wingGrad})` : p.wingMembrane}
        stroke={p.outline}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="M40 70 C30 55 16 51 7 55" fill="none" stroke={p.wing} strokeWidth={3} strokeLinecap="round" />
      <path d="M30 62 L13 66 M33 67 L21 73" stroke={p.wing} strokeWidth={1.2} strokeLinecap="round" opacity={0.7} />
    </g>
  );

  const EarFin = <path d="M33 34 L19 27 L27 47 Z" fill={p.wingMembrane} stroke={p.outline} strokeWidth={1.4} strokeLinejoin="round" />;

  const Eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={38} rx={7.5} ry={8.5} fill="#ffffff" stroke={p.outline} strokeWidth={1.5} />
      <circle cx={cx + 1} cy={39} r={5.2} fill={p.eye} />
      <circle cx={cx + 1} cy={39.5} r={2.6} fill="#16161f" />
      <circle cx={cx + 3} cy={36.4} r={1.8} fill="#ffffff" />
      <circle cx={cx - 1} cy={41.6} r={0.9} fill="#ffffff" opacity={0.9} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Naga ${tier.name}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {faceted ? (
          // Bidang dipahat: terang di kiri-atas, gelap di kanan-bawah, batas tajam.
          <linearGradient id={bodyGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.body} />
            <stop offset="54%" stopColor={p.body} />
            <stop offset="54%" stopColor={p.bodyShade} />
            <stop offset="100%" stopColor={p.bodyShade} />
          </linearGradient>
        ) : finish === 'lacquer' ? (
          <radialGradient id={bodyGrad} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={p.body} />
            <stop offset="70%" stopColor={p.bodyShade} />
            <stop offset="100%" stopColor={p.bodyShade} />
          </radialGradient>
        ) : finish === 'ink' ? (
          <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.body} />
            <stop offset="100%" stopColor={p.body} />
          </linearGradient>
        ) : (
          <linearGradient id={bodyGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.body} />
            <stop offset="100%" stopColor={p.bodyShade} />
          </linearGradient>
        )}
        <linearGradient id={hornGrad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={p.horn} />
          <stop offset="50%" stopColor={p.horn} />
          <stop offset="50%" stopColor={hornShade} />
          <stop offset="100%" stopColor={hornShade} />
        </linearGradient>
        <linearGradient id={wingGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.wingMembrane} />
          <stop offset="50%" stopColor={p.wingMembrane} />
          <stop offset="50%" stopColor={p.wing} />
          <stop offset="100%" stopColor={p.wing} />
        </linearGradient>
        <radialGradient id={glossGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        {finish === 'ink' && (
          // Sama dengan ikon navigasi (EngravingIcons): garis tinta bergetar seperti ukiran.
          <filter id={inkFilter} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
        <radialGradient id={auraGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.glow} stopOpacity={0.55} />
          <stop offset="100%" stopColor={p.glow} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Aura lembut (Elder ke atas, dan saat evolusi) */}
      {showAura && (
        <motion.circle
          cx={60} cy={68} r={56}
          fill={`url(#${auraGrad})`}
          animate={animated ? { opacity: mood === 'evolving' ? [0.6, 1, 0.6] : [0.45, 0.75, 0.45] } : { opacity: 0.6 }}
          transition={loop(mood === 'evolving' ? 0.9 : 3.5)}
        />
      )}

      {/* Cincin cahaya evolusi */}
      {mood === 'evolving' && animated && (
        <motion.circle
          cx={60} cy={68} fill="none" stroke={p.glow} strokeWidth={2.5}
          initial={{ r: 20, opacity: 0.9 }}
          animate={{ r: [20, 60], opacity: [0.9, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Bayangan */}
      <ellipse cx={60} cy={114} rx={26} ry={4} fill="#000" opacity={0.18} />

      <motion.g animate={root} style={pivot(60, 112)} filter={finish === 'ink' ? `url(#${inkFilter})` : undefined}>
        {/* Ekor */}
        <motion.g animate={tail} style={pivot(82, 98)}>
          <path d="M80 98 C98 104 108 92 102 80" fill="none" stroke={p.outline} strokeWidth={11} strokeLinecap="round" />
          <path d="M80 98 C98 104 108 92 102 80" fill="none" stroke={p.bodyShade} strokeWidth={7.5} strokeLinecap="round" />
          <path d="M97 81 L103 69 L109 82 Q103 79 97 81 Z" fill={p.wing} stroke={p.outline} strokeWidth={1.5} strokeLinejoin="round" />
        </motion.g>

        {/* Sayap */}
        <motion.g animate={wing} style={pivot(40, 70)}>{Wing}</motion.g>
        <g transform="translate(120 0) scale(-1 1)">
          <motion.g animate={wingR} style={pivot(40, 70)}>{Wing}</motion.g>
        </g>

        {/* Badan */}
        <path
          d="M60 62 C79 62 87 78 87 90 C87 104 75 110 60 110 C45 110 33 104 33 90 C33 78 41 62 60 62 Z"
          fill={`url(#${bodyGrad})`}
          stroke={edge}
          strokeWidth={lineW}
        />
        <path d="M60 72 C70 72 75 82 75 92 C75 102 68 106 60 106 C52 106 45 102 45 92 C45 82 50 72 60 72 Z" fill={p.belly} />
        {faceted && <path d="M41 78 Q44 70 52 66" fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1.8} strokeLinecap="round" />}
        <path d="M48 85 Q60 89 72 85 M46.5 95 Q60 99 73.5 95" fill="none" stroke={p.bodyShade} strokeWidth={1.3} opacity={0.55} strokeLinecap="round" />

        {/* Kaki */}
        <ellipse cx={46} cy={108} rx={9} ry={5} fill={p.bodyShade} stroke={p.outline} strokeWidth={1.6} />
        <ellipse cx={74} cy={108} rx={9} ry={5} fill={p.bodyShade} stroke={p.outline} strokeWidth={1.6} />
        <path d="M42 110 v-2.5 M46 111 v-2.5 M50 110 v-2.5 M70 110 v-2.5 M74 111 v-2.5 M78 110 v-2.5" stroke={p.outline} strokeWidth={1} strokeLinecap="round" opacity={0.6} />

        {/* Lengan kiri (diam) & kanan (melambai / menunjuk) */}
        <ellipse cx={38} cy={86} rx={5} ry={8} fill={p.body} stroke={p.outline} strokeWidth={1.6} transform="rotate(25 38 86)" />
        <motion.g animate={arm} style={pivot(80, 80)}>
          <ellipse cx={82} cy={88} rx={5} ry={8} fill={p.body} stroke={p.outline} strokeWidth={1.6} transform="rotate(-25 82 88)" />
        </motion.g>

        {/* Kepala */}
        <motion.g animate={head} style={pivot(60, 64)}>
          {Horn}
          <g transform="translate(120 0) scale(-1 1)">{Horn}</g>

          {t >= 2 && (
            <path d="M50 22 L55 9 L60 20 L65 8 L70 22 Z" fill={p.horn} stroke={p.outline} strokeWidth={1.4} strokeLinejoin="round" />
          )}

          {EarFin}
          <g transform="translate(120 0) scale(-1 1)">{EarFin}</g>

          <ellipse cx={60} cy={42} rx={30} ry={25} fill={`url(#${bodyGrad})`} stroke={edge} strokeWidth={lineW} />
          {/* Kilau: garis pantul tajam (logam) atau kilap lembut (pernis) */}
          {faceted && (
            <path d="M38 28 Q48 20 62 19" fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
          )}
          {finish === 'lacquer' && <ellipse cx={46} cy={28} rx={10} ry={5} fill={`url(#${glossGrad})`} transform="rotate(-20 46 28)" />}

          {/* Corak kuno (Ancient ke atas) */}
          {t >= 5 && (
            <path d="M33 31 Q37 28 40 32 M80 32 Q83 28 87 31" fill="none" stroke={p.bodyShade} strokeWidth={2} strokeLinecap="round" />
          )}

          {/* Moncong */}
          <ellipse cx={60} cy={54} rx={15} ry={10} fill={p.belly} stroke={p.outline} strokeWidth={1.4} />
          <ellipse cx={55} cy={50.5} rx={1.5} ry={1.1} fill={p.outline} />
          <ellipse cx={65} cy={50.5} rx={1.5} ry={1.1} fill={p.outline} />

          {/* Pipi */}
          {cheek && (
            <>
              <ellipse cx={36} cy={50} rx={5} ry={3} fill={cheek} opacity={finish === 'ink' ? 0.7 : 0.45} />
              <ellipse cx={84} cy={50} rx={5} ry={3} fill={cheek} opacity={finish === 'ink' ? 0.7 : 0.45} />
            </>
          )}

          {/* Mata */}
          {happyEyes ? (
            <path d="M41 40 Q47 32 53 40 M67 40 Q73 32 79 40" fill="none" stroke={p.outline} strokeWidth={2.6} strokeLinecap="round" />
          ) : (
            <>
              <motion.g animate={blink} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>{Eye(47)}</motion.g>
              <motion.g animate={blink} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>{Eye(73)}</motion.g>
            </>
          )}

          {/* Mulut */}
          {mood === 'talking' ? (
            <motion.ellipse
              cx={60} cy={58.5} rx={3.8} fill="#7a2f3a"
              initial={{ ry: 1.2 }}
              animate={animated ? { ry: [1.2, 3.2, 1.4, 2.8, 1.2] } : { ry: 2 }}
              transition={loop(0.6)}
            />
          ) : happyEyes || mood === 'greeting' ? (
            <path d="M53 56.5 Q60 65 67 56.5 Z" fill="#7a2f3a" stroke={p.outline} strokeWidth={1.2} strokeLinejoin="round" />
          ) : mood === 'thinking' ? (
            <path d="M56 58.5 Q60 57 64 58.5" fill="none" stroke={p.outline} strokeWidth={1.6} strokeLinecap="round" />
          ) : (
            <path d="M54 57 Q60 61.5 66 57" fill="none" stroke={p.outline} strokeWidth={1.6} strokeLinecap="round" />
          )}

          {/* Kumis (Elder ke atas) */}
          {t >= 4 && (
            <path d="M46 56 C36 58 30 64 25 61 M74 56 C84 58 90 64 95 61" fill="none" stroke={p.horn} strokeWidth={1.8} strokeLinecap="round" />
          )}

          {/* Permata dahi (Ancient ke atas) */}
          {t >= 5 && <ellipse cx={60} cy={25} rx={3.2} ry={3.8} fill={p.glow} stroke={p.outline} strokeWidth={1.3} />}

          {/* Cangkang telur di kepala (Hatchling) */}
          {t === 0 && (
            <g>
              <path
                d="M43 23 L47 15 L51 20 L55 12 L60 19 L65 12 L69 20 L73 15 L77 23 Q60 30 43 23 Z"
                fill="#fbf6e6" stroke={p.outline} strokeWidth={1.5} strokeLinejoin="round"
              />
              <circle cx={52} cy={22} r={1.8} fill={p.bodyShade} opacity={0.5} />
              <circle cx={66} cy={21} r={1.4} fill={p.bodyShade} opacity={0.5} />
            </g>
          )}
        </motion.g>

        {/* Halo (Celestial) */}
        {t >= 6 && (
          <motion.ellipse
            cx={60} cy={6} rx={15} ry={3.6} fill="none" stroke={p.glow} strokeWidth={2.6}
            animate={animated ? { y: [0, -2, 0] } : {}}
            transition={loop(2.6)}
          />
        )}
      </motion.g>

      {/* Titik berpikir */}
      {mood === 'thinking' && (
        <g>
          {[0, 1, 2].map(i => (
            <motion.circle
              key={i}
              cx={96 + i * 7} cy={22 - i * 6} r={2.4 + i * 0.6}
              fill={p.wingMembrane} stroke={p.outline} strokeWidth={1}
              animate={animated ? { opacity: [0.2, 1, 0.2] } : { opacity: 1 }}
              transition={loop(1.2, { delay: i * 0.2 })}
            />
          ))}
        </g>
      )}
    </svg>
  );
};

interface DragonEggProps {
  size?: number;
  /** 0..3 retakan. */
  cracks?: number;
  wobble?: boolean;
}

/** Telur naga sebelum menetas. */
export const DragonEgg: React.FC<DragonEggProps> = ({ size = 96, cracks = 0, wobble = true }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const grad = `egg-${uid}`;
  const outline = '#2c4a3f';
  const fast = cracks > 0;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Telur naga" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#e9dfc4" />
        </linearGradient>
      </defs>
      <ellipse cx={60} cy={113} rx={24} ry={4} fill="#000" opacity={0.18} />
      <motion.g
        style={pivot(60, 110)}
        animate={wobble && !reduce ? { rotate: fast ? [0, -9, 9, -6, 0] : [0, -4, 4, 0] } : {}}
        transition={{ duration: fast ? 0.5 : 1.2, repeat: Infinity, repeatDelay: fast ? 0.4 : 1.8 }}
      >
        <path
          d="M60 14 C82 14 96 50 96 74 C96 96 80 110 60 110 C40 110 24 96 24 74 C24 50 38 14 60 14 Z"
          fill={`url(#${grad})`} stroke={outline} strokeWidth={2}
        />
        <ellipse cx={46} cy={50} rx={7} ry={9} fill="#7fc8a9" opacity={0.7} />
        <ellipse cx={74} cy={72} rx={9} ry={7} fill="#7fc8a9" opacity={0.7} />
        <ellipse cx={50} cy={88} rx={6} ry={5} fill="#7fc8a9" opacity={0.7} />
        <ellipse cx={70} cy={36} rx={4} ry={5} fill="#7fc8a9" opacity={0.6} />
        <path d="M44 30 Q48 24 54 22" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
        {cracks >= 1 && <path d="M60 40 L55 48 L62 54 L57 62" fill="none" stroke={outline} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
        {cracks >= 2 && <path d="M62 54 L72 58 L76 66" fill="none" stroke={outline} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
        {cracks >= 3 && <path d="M30 66 L40 62 L46 70 L55 64 L62 72 L72 66 L80 72 L90 66" fill="none" stroke={outline} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      </motion.g>
    </svg>
  );
};
