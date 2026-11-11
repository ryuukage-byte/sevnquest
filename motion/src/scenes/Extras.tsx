import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { c, font } from "../theme";
import { Background, Card, Label, Title, fadeOut, useEnter } from "../ui";
import { T } from "../timeline";

const ITEMS = [
  { icon: "🔖", name: "Buku Saku", text: "Deck pribadi + AI deck", color: c.kotoba },
  { icon: "📜", name: "Misi Harian", text: "Jaga ritme belajar", color: c.gold },
  { icon: "🏆", name: "Rank", text: "Papan peringkat", color: c.bunpou },
  { icon: "🎵", name: "Imersi", text: "Lagu & video, lirik karaoke", color: c.kana },
];

const Item: React.FC<{ i: number }> = ({ i }) => {
  const f = useCurrentFrame();
  const p = useEnter(14 + i * 14);
  const it = ITEMS[i];
  return (
    <Card
      accent={it.color}
      style={{
        width: 900,
        height: 190,
        display: "flex",
        alignItems: "center",
        gap: 40,
        padding: "0 50px",
        opacity: p,
        transform: `translateY(${(1 - p) * 80}px) rotate(${(1 - p) * (i % 2 ? 4 : -4)}deg)`,
      }}
    >
      <div style={{ fontSize: 84 }}>{it.icon}</div>
      <div>
        <div style={{ fontFamily: font.heading, fontWeight: 900, fontSize: 56, color: it.color }}>{it.name}</div>
        <div style={{ fontFamily: font.body, fontWeight: 500, fontSize: 30, color: c.textSec }}>
          {i === 3 ? (
            <span>
              {it.text.split(" ").map((w, k) => (
                <span key={k} style={{ color: f > 70 + k * 6 ? c.gold : c.textSec }}>{w} </span>
              ))}
            </span>
          ) : (
            it.text
          )}
        </div>
      </div>
    </Card>
  );
};

export const Extras: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: fadeOut(f, T.extras.dur) }}>
      <Background glow={c.indigo} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 170, gap: 28 }}>
        <Label delay={0}>DAN LEBIH BANYAK</Label>
        <Title delay={6}>Teman setia belajar</Title>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 28, paddingTop: 200 }}>
        {ITEMS.map((_, i) => (
          <Item key={i} i={i} />
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
