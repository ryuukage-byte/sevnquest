import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Card, Label, Title, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

const STEPS = [
  { n: "1", name: "Belajar", text: "Buku Saku & Library", icon: "📖", color: c.kotoba },
  { n: "2", name: "Latihan", text: "Salah pun dicatat", icon: "🔥", color: c.kanji },
  { n: "3", name: "Mastery", text: "Yang lemah diulang di Recall", icon: "🔁", color: c.kana },
  { n: "4", name: "EXP & Tier", text: "Naik level, naik pangkat", icon: "⭐", color: c.gold },
];

export const Loop: React.FC = () => {
  const f = useCurrentFrame();
  const bar = interpolate(f, [40, 170], [8, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const active = Math.min(3, Math.floor(Math.max(0, f - 40) / 32));
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.loop.dur) }}>
      <Background glow={c.kana} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170, gap: 28 }}>
        <Label delay={0}>SISTEM BELAJAR</Label>
        <Title delay={6}>EXP mengikuti
          <br />penguasaanmu</Title>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 26, paddingTop: 220 }}>
        {STEPS.map((s, i) => {
          const p = useEnter(26 + i * 12);
          const on = i <= active && f > 40;
          return (
            <Card
              key={s.n}
              accent={on ? s.color : undefined}
              style={{
                width: 860,
                height: 150,
                display: "flex",
                alignItems: "center",
                gap: 36,
                padding: "0 44px",
                opacity: p,
                transform: `translateY(${(1 - p) * 60}px) scale(${on ? 1.03 : 1})`,
              }}
            >
              <div style={{ fontSize: 70 }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 48, color: on ? s.color : c.text }}>
                  {s.n}. {s.name}
                </div>
                <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 28, color: c.textSec }}>{s.text}</div>
              </div>
            </Card>
          );
        })}
        {/* bar EXP */}
        <div style={{ width: 860, marginTop: 30 }}>
          <div style={{ fontFamily: font.body, fontWeight: 800, color: c.gold, fontSize: 28, letterSpacing: 4, marginBottom: 12 }}>
            EXP {Math.round(bar * 12)} / 1200
          </div>
          <div style={{ height: 36, borderRadius: 18, background: c.inset, border: `2px solid ${c.borderSubtle}`, overflow: "hidden" }}>
            <div
              style={{
                width: `${bar}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${c.goldShadow}, ${c.gold}, ${c.goldSoft})`,
                boxShadow: `0 0 30px ${c.gold}88`,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
