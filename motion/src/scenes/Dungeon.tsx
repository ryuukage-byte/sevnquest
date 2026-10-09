import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Card, Label, Title, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

// Judul gate disalin dari DungeonPortalHub.tsx
const GATES = [
  { icon: "✍️", name: "Menulis Aksara", color: c.kanji },
  { icon: "🃏", name: "Gerbang Ingatan", color: c.kotoba },
  { icon: "🏰", name: "Kuil Tata Bahasa", color: c.bunpou },
  { icon: "🔮", name: "Altar Konjugasi", color: c.choukai },
  { icon: "⚡", name: "Arena Kuis Cepat", color: c.gold },
  { icon: "💀", name: "Kanji Extreme", color: c.danger },
  { icon: "📜", name: "Kreasi Kalimat", color: c.dokkai },
  { icon: "🎧", name: "Dungeon Imersi", color: c.kana },
];

const Gate: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const p = useEnter(24 + i * 6, { damping: 12, stiffness: 140 });
  const g = GATES[i];
  const pop = interpolate(f - (90 + i * 8), [0, 6, 16], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Card
      accent={g.color}
      style={{
        width: 430,
        height: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        position: "relative",
        opacity: p,
        transform: `scale(${0.6 + p * 0.4}) translateY(${(1 - p) * 60}px)`,
        boxShadow: `0 0 ${pop * 50}px ${g.color}aa`,
      }}
    >
      <div style={{ fontSize: 80 }}>{g.icon}</div>
      <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 38, color: c.text }}>{g.name}</div>
      <div
        style={{
          position: "absolute",
          top: 10 - pop * 40,
          right: 24,
          opacity: pop,
          fontFamily: font.body,
          fontWeight: 800,
          fontSize: 30,
          color: c.gold,
        }}
      >
        +25 EXP
      </div>
    </Card>
  );
};

export const Dungeon: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.dungeon.dur) }}>
      <Background glow={c.choukai} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170, gap: 28 }}>
        <Label delay={0} color={c.choukai}>DUNGEON</Label>
        <Title delay={6}>Latihan rasa
          <br />game arcade</Title>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 280 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 430px)", gap: 28 }}>
          {GATES.map((_, i) => (
            <Gate key={i} i={i} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
