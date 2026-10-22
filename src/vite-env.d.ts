/// <reference types="vite/client" />

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

/** Petunjuk ucapan TTS hasil build (speechHintKey → teks hibrida); lihat scripts/speech/speechHints.ts. */
declare module 'virtual:sevn-speech-hints' {
  const hints: Record<string, string>;
  export default hints;
}
