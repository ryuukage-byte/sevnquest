import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Label, Sub, useEnter } from "../ui";

export const Cta: React.FC = () => {
  const f = useCurrentFrame();
  const p = useEnter(6, { damping: 10, stiffness: 100 });
  const pulse = 1 + Math.sin(f / 6) * 0.025;
  const shine = interpolate(f, [40, 80], [-30, 130], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <Background glow={c.gold} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 44 }}>
        <Label delay={0}>PETUALANGANMU</Label>
        <div
          style={{
            fontFamily: font.heading,
            fontWeight: 900,
            fontSize: 120,
            color: c.text,
            textAlign: "center",
            lineHeight: 1.1,
            transform: `scale(${0.85 + p * 0.15})`,
            opacity: p,
          }}
        >
          Mulai
          <br />
          hari ini
        </div>
        <Sub delay={20}>Gratis di browser. Pasang sebagai PWA di HP-mu.</Sub>
        <div
          style={{
            marginTop: 30,
            padding: "34px 90px",
            borderRadius: 32,
            fontFamily: font.heading,
            fontWeight: 900,
            fontSize: 64,
            color: c.base,
            transform: `scale(${pulse})`,
            backgroundImage: `linear-gradient(110deg, ${c.gold} ${shine - 20}%, #fff7d6 ${shine}%, ${c.gold} ${shine + 20}%)`,
            boxShadow: `0 10px 40px ${c.gold}66`,
          }}
        >
          ⛩️ SevnQuest
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
