// ==============================================================================
// LRC
// Membaca lirik format LRC: tiap baris "[mm:ss.xx]teks", satu baris boleh punya beberapa penanda waktu
// (refrain yang diulang). Tag [offset:±ms] menggeser semua waktu; positif = lirik muncul lebih awal.
// Penanda waktu hanya diterima di awal baris dan harus berurutan, jadi "[ar:…]" dan teks biasa dibuang.
// Logika ini mengikuti ParseLRC di mixmusic (lyrics/lyrics.go, MIT).
// ==============================================================================

export interface TimedLine {
  startMs: number;
  text: string;
}

export interface TimedLineWithEnd extends TimedLine {
  endMs: number;
}

/** Baris terakhir tanpa durasi lagu diberi panjang ini. */
const LAST_LINE_MS = 5000;

const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\]/;
const TIME_TAG = /^\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/;

function tagMs(min: string, sec: string, frac: string | undefined): number {
  // "5" = 500 ms, "05" = 50 ms, "123" = 123 ms.
  const ms = frac ? Number(frac.padEnd(3, '0')) : 0;
  return (Number(min) * 60 + Number(sec)) * 1000 + ms;
}

/** Membaca teks LRC. Hasilnya terurut menurut waktu; baris kosong tetap ada karena merupakan jeda. */
export function parseLrc(lrc: string): TimedLine[] {
  const lines: TimedLine[] = [];
  let offset = 0;
  for (const raw of lrc.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    const off = OFFSET_TAG.exec(line);
    if (off) {
      offset = Number(off[1]);
      continue;
    }
    const times: number[] = [];
    let rest = line;
    for (let m = TIME_TAG.exec(rest); m; m = TIME_TAG.exec(rest)) {
      times.push(tagMs(m[1], m[2], m[3]));
      rest = rest.slice(m[0].length);
    }
    if (times.length === 0) continue;
    const text = rest.trim();
    for (const t of times) lines.push({ startMs: Math.max(t - offset, 0), text });
  }
  // Array.prototype.sort stabil: baris yang waktunya sama tetap pada urutan aslinya.
  return lines.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Lirik dianggap berwaktu bila setidaknya dua baris berisi punya waktu berbeda. Lirik dengan satu waktu
 * saja (mis. "[00:00.00]probe") tidak akan pernah bergerak, jadi diperlakukan sebagai lirik biasa.
 */
export function isSynced(lines: readonly TimedLine[]): boolean {
  let first: number | null = null;
  for (const l of lines) {
    if (l.text.trim() === '') continue;
    if (first === null) first = l.startMs;
    else if (l.startMs !== first) return true;
  }
  return false;
}

/**
 * Menambahkan akhir tiap baris: baris berakhir saat baris berikutnya mulai. Baris terakhir berakhir di
 * durationMs bila diketahui, kalau tidak LAST_LINE_MS setelah mulainya.
 */
export function withEndTimes(lines: readonly TimedLine[], durationMs?: number): TimedLineWithEnd[] {
  return lines.map((l, i) => {
    const next = lines[i + 1];
    const fallback = l.startMs + LAST_LINE_MS;
    const endMs = next ? next.startMs : Math.max(durationMs ?? fallback, l.startMs);
    return { ...l, endMs };
  });
}
