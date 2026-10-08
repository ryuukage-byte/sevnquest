/**
 * ID minggu ISO-8601 berbasis UTC, format "2026-W40".
 * Server (submit_score_event_v2) memakai to_char(now() AT TIME ZONE 'UTC', 'IYYY"-W"IW'); klien harus
 * menghasilkan nilai yang sama persis supaya papan peringkat mingguan membaca baris yang ditulis server,
 * termasuk di batas minggu (sebelumnya klien memakai jam lokal).
 */
export function getIsoWeekId(date: Date = new Date()): string {
  // Kamis pada minggu yang sama menentukan tahun ISO.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Senin=1 ... Minggu=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
