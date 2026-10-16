import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { c, font, neu } from "./theme";

export const Background: React.FC<{ glow?: string }> = ({ glow = c.indigo }) => {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 90) * 40;
  return (
    <AbsoluteFill style={{ background: c.base }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${50 + drift / 10}% 30%, ${glow}22, transparent 70%)`,
        }}
      />
      {/* sashiko stitch: garis jahit tipis */}
      {[0.18, 0.5, 0.82].map((y) => (
        <div
          key={y}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${y * 100}%`,
            height: 3,
            opacity: 0.5,
            backgroundImage: `repeating-linear-gradient(90deg, ${c.thread} 0 16px, transparent 16px 32px)`,
            backgroundPosition: `${drift * 2}px 0`,
          }}
        />
      ))}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 300px rgba(0,0,0,0.6)" }} />
    </AbsoluteFill>
  );
};

export const useEnter = (delay = 0, config = { damping: 16, stiffness: 120 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config });
};

export const fadeOut = (frame: number, dur: number, len = 10) =>
  interpolate(frame, [dur - len, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const Label: React.FC<{ children: React.ReactNode; delay?: number; color?: string }> = ({
  children,
  delay = 0,
  color = c.gold,
}) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        fontFamily: font.body,
        fontWeight: 800,
        letterSpacing: 8,
        fontSize: 30,
        color,
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const Title: React.FC<{ children: React.ReactNode; delay?: number; size?: number }> = ({
  children,
  delay = 0,
  size = 84,
}) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        fontFamily: font.heading,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.1,
        color: c.text,
        textAlign: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px)`,
        textShadow: "0 4px 24px rgba(0,0,0,0.6)",
      }}
    >
      {children}
    </div>
  );
};

export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  accent?: string;
}> = ({ children, style, accent }) => (
  <div
    style={{
      background: `linear-gradient(160deg, ${c.elevated}, ${c.card})`,
      borderRadius: 36,
      border: `2px solid ${accent ? accent + "88" : c.borderSubtle}`,
      boxShadow: neu,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Sub: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const p = useEnter(delay);
  return (
    <div
      style={{
        fontFamily: font.body,
        fontWeight: 500,
        fontSize: 38,
        lineHeight: 1.4,
        color: c.textSec,
        textAlign: "center",
        opacity: p,
        padding: "0 90px",
      }}
    >
      {children}
    </div>
  );
};
