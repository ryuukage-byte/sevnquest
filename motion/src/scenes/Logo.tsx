import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Label, Sub, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

export const Logo: React.FC = () => {
  const f = useCurrentFrame();
  const p = useEnter(4, { damping: 12, stiffness: 90 });
  const sweep = interpolate(f, [24, 60], [-40, 140], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.logo.dur) }}>
      <Background glow={c.gold} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 36 }}>
        <div style={{ fontSize: 160, transform: `scale(${p})`, filter: "drop-shadow(0 8px 30px rgba(240,190,82,0.4))" }}>⛩️</div>
        <div
          style={{
            fontFamily: font.heading,
            fontWeight: 900,
            fontSize: 150,
            letterSpacing: 4,
            transform: `scale(${0.8 + p * 0.2})`,
            opacity: p,
            backgroundImage: `linear-gradient(100deg, ${c.gold} ${sweep - 25}%, ${c.goldSoft} ${sweep}%, ${c.gold} ${sweep + 25}%)`,
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          SevnQuest
        </div>
        <Label delay={18} color={c.indigo}>
          N5 → N1
        </Label>
        <Sub delay={30}>Belajar bahasa Jepang, rasa petualangan RPG.</Sub>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
