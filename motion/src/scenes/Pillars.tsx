import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Card, Label, Title, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

const PILLARS = [
  { jp: "言葉", name: "Kotoba", text: "Arti, bacaan, contoh pemakaian", color: c.kotoba },
  { jp: "漢字", name: "Kanji", text: "Bentuk, bacaan, urutan goresan", color: c.kanji },
  { jp: "文法", name: "Pola Kalimat", text: "Bunpou untuk menyusun kalimat", color: c.bunpou },
];

const PillarCard: React.FC<{ i: number }> = ({ i }) => {
  const p = useEnter(30 + i * 22, { damping: 14, stiffness: 110 });
  const { jp, name, text, color } = PILLARS[i];
  return (
    <Card
      accent={color}
      style={{
        width: 900,
        height: 280,
        display: "flex",
        alignItems: "center",
        gap: 48,
        padding: "0 56px",
        opacity: p,
        transform: `translateX(${(1 - p) * (i % 2 ? 300 : -300)}px) scale(${0.9 + p * 0.1})`,
      }}
    >
      <div
        style={{
          fontFamily: font.heading,
          fontWeight: 900,
          fontSize: 120,
          color,
          minWidth: 270,
          textShadow: `0 0 40px ${color}55`,
        }}
      >
        {jp}
      </div>
      <div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 64, color: c.text }}>{name}</div>
        <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 32, color: c.textSec, marginTop: 8 }}>{text}</div>
      </div>
    </Card>
  );
};

export const Pillars: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.pillars.dur) }}>
      <Background glow={c.kotoba} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 180, gap: 28 }}>
        <Label delay={0}>ISI MATERI</Label>
        <Title delay={6}>3 pilar belajar</Title>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 36, paddingTop: 200 }}>
        {PILLARS.map((_, i) => (
          <PillarCard key={i} i={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
