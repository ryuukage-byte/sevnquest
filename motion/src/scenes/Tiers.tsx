import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Label, Title, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

// Nama tier dari src/data/rpg/tiers.ts
const TIERS = [
  { n: 1, name: "Villager", lvl: "N5" },
  { n: 3, name: "Apprentice", lvl: "N4" },
  { n: 5, name: "Knight", lvl: "N3" },
  { n: 7, name: "Paladin", lvl: "N2" },
  { n: 9, name: "Champion", lvl: "N1" },
  { n: 10, name: "Mythic Deity", lvl: "N1" },
];

const Rung: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const t = TIERS[i];
  const p = useEnter(18 + i * 16);
  const isTop = i === TIERS.length - 1;
  const glow = isTop ? interpolate(Math.sin(f / 8), [-1, 1], [0.3, 1]) : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 36,
        opacity: p,
        transform: `translateX(${(1 - p) * -200}px)`,
        marginLeft: i * 40,
      }}
    >
      <Img
        src={staticFile(`avatars/tier-${t.n}.png`)}
        style={{
          width: 170,
          height: 170,
          borderRadius: 40,
          objectFit: "cover",
          border: `3px solid ${isTop ? c.gold : c.border}`,
          boxShadow: isTop ? `0 0 ${60 * glow}px ${c.gold}` : undefined,
        }}
      />
      <div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 58, color: isTop ? c.gold : c.text }}>{t.name}</div>
        <div style={{ fontFamily: font.body, fontWeight: 800, fontSize: 30, letterSpacing: 6, color: c.indigo }}>{t.lvl}</div>
      </div>
    </div>
  );
};

export const Tiers: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.tiers.dur) }}>
      <Background glow={c.gold} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 150, gap: 24 }}>
        <Label delay={0}>PROGRESSION</Label>
        <Title delay={6} size={76}>Dari Villager
          <br />sampai Mythic Deity</Title>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", paddingLeft: 90, paddingTop: 260, gap: 26, flexDirection: "column-reverse", alignItems: "flex-start" }}>
        {TIERS.map((_, i) => (
          <Rung key={i} i={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
