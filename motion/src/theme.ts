// Token disalin dari src/index.css (Washi Scroll, dark mode) di app utama.
import "./fonts/fonts.css"; // font di-bundel lokal (render offline, tanpa Google Fonts)

export const font = {
  body: "'Plus Jakarta Sans', system-ui, sans-serif",
  heading: "'Zen Old Mincho', 'Noto Sans JP', serif",
  jp: "'Noto Sans JP', sans-serif",
};

export const c = {
  base: "#12151d",
  card: "#1f242f",
  elevated: "#2a3040",
  inset: "#191d26",
  indigoDeep: "#26314a",
  indigo: "#6f93cf",
  thread: "rgba(151,181,224,0.35)",
  gold: "#f0be52",
  goldSoft: "#fde8a8",
  goldShadow: "#8c6810",
  text: "#edf0f6",
  textSec: "#b1bace",
  textMuted: "#96a1b8",
  border: "rgba(111,147,207,0.4)",
  borderSubtle: "rgba(111,147,207,0.18)",
  success: "#4fae86",
  danger: "#e2555b",
  // pilar belajar
  kana: "#4fae86",
  kanji: "#e2555b",
  kotoba: "#6f93cf",
  bunpou: "#d9a54a",
  choukai: "#9b65c9",
  dokkai: "#26a69a",
};

// Neumorphic dual-shadow ala app
export const neu = "6px 6px 16px rgba(0,0,0,0.5), -4px -4px 12px rgba(255,255,255,0.045)";
export const neuPressed = "inset 3px 3px 6px rgba(0,0,0,0.5), inset -3px -3px 6px rgba(255,255,255,0.045)";
