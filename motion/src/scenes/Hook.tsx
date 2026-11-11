import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Label, Title, fadeOut } from "../ui";
import { T } from "../timeline";

// Kanji besar yang "ditulis" dengan mask sapuan kuas.
const InkKanji: React.FC<{ ch: string; delay: number; x: number }> = ({ ch, delay, x }) => {
  const f = useCurrentFrame();
  const reveal = interpolate(f - delay, [0, 22], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: 560,
        fontFamily: font.heading,
        fontWeight: 900,
        fontSize: 420,
        color: c.danger,
        opacity: 0.92,
        clipPath: `inset(0 ${100 - reveal}% 0 0)`,
        textShadow: "0 0 60px rgba(226,85,91,0.35)",
      }}
    >
      {ch}
    </div>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const { dur } = T.hook;
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, dur) }}>
      <Background glow={c.danger} />
      <InkKanji ch="日" delay={6} x={120} />
      <InkKanji ch="本" delay={18} x={540} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 220, gap: 40 }}>
        <Label delay={0}>BELAJAR JEPANG</Label>
        <Title delay={4} size={96}>
          Kanji, kana,
          <br />
          tata bahasa…
        </Title>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 260 }}>
        <Title delay={55} size={72}>
          Kok rasanya berat?
        </Title>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
