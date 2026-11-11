import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Label, Title, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

// Jalur peta: 5 stage + boss (map_kana_hiragana di data/world/maps.json)
const NODES = [
  { x: 240, y: 1500 },
  { x: 700, y: 1360 },
  { x: 330, y: 1200 },
  { x: 760, y: 1040 },
  { x: 380, y: 880 },
  { x: 560, y: 700, boss: true },
];

export const World: React.FC = () => {
  const f = useCurrentFrame();
  const path = NODES.map((n, i) => `${i ? "L" : "M"}${n.x} ${n.y}`).join(" ");
  const draw = interpolate(f, [20, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bossP = useEnter(150, { damping: 8, stiffness: 100 });
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.world.dur) }}>
      <Background glow={c.kana} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170, gap: 28 }}>
        <Label delay={0} color={c.kana}>WORLD MAP</Label>
        <Title delay={6}>Mulai dari
          <br />Kuil Hiragana</Title>
      </AbsoluteFill>
      <svg width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <path d={path} fill="none" stroke={c.thread} strokeWidth={8} strokeDasharray="4 18" strokeLinecap="round" />
        <path
          d={path}
          fill="none"
          stroke={c.kana}
          strokeWidth={10}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
          style={{ filter: `drop-shadow(0 0 12px ${c.kana})` }}
        />
        {NODES.map((n, i) => {
          const reached = draw >= i / (NODES.length - 1) - 0.01;
          const boss = "boss" in n;
          const s = boss ? bossP : 1;
          return (
            <g key={i} transform={`translate(${n.x} ${n.y}) scale(${reached ? s : 0.6})`} opacity={reached ? 1 : 0.5}>
              <circle r={boss ? 78 : 46} fill={c.card} stroke={boss ? c.danger : reached ? c.kana : c.border} strokeWidth={6} />
              <text textAnchor="middle" dy={boss ? 26 : 16} fontSize={boss ? 70 : 44} fontFamily={font.heading} fontWeight={900} fill={boss ? c.danger : c.text}>
                {boss ? "ボス" : i + 1}
              </text>
            </g>
          );
        })}
        {["あ", "い", "う", "え", "お"].map((k, i) => (
          <text
            key={k}
            x={80 + i * 210}
            y={1700 - Math.sin((f + i * 20) / 25) * 14}
            fontSize={90}
            fontFamily={font.heading}
            fill={c.kana}
            opacity={0.35}
          >
            {k}
          </text>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
