/**
 * Time and Study Duration Helper Utilities
 */

/**
 * Returns today's local date string formatted as YYYY-MM-DD.
 * Using local date components avoids timezone shifts when users are in GMT+7 / GMT+9.
 */
export function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the ISO-8601 week id (e.g. "2026-W40") of the given date using LOCAL calendar fields.
 * Dipakai untuk reset misi mingguan (Senin 00:00 waktu lokal).
 */
export function getLocalIsoWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Senin=1 ... Minggu=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Kamis pada minggu yang sama menentukan tahun ISO
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Formats seconds into a compact string suitable for HUD display.
 * - Under 1 min: "45s"
 * - Under 1 hour: "15m"
 * - 1 hour or more: "1j 15m" or "2j"
 */
export function formatStudyTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  
  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }
  
  const minutes = Math.floor(safeSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}j`;
  }
  return `${hours}j ${remainingMinutes}m`;
}

/**
 * Formats seconds into human-readable detailed Indonesian text for tooltips.
 * Example: "1 jam 25 menit 14 detik"
 */
export function formatDetailedStudyTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs} jam`);
  if (mins > 0) parts.push(`${mins} menit`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs} detik`);

  return parts.join(' ');
}
