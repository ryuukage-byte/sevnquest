/**
 * Detail kotoba (contoh kalimat, kolokasi, definisi) yang tidak ikut chunk awal. Saat dievaluasi, modul ini
 * menggabungkan detail ke objek di KOTOBA_DATABASE (in place). Dimuat lewat `ensureFullData()`.
 *
 * Di build, impor JSON di bawah dialihkan plugin `kotobaSplit` (vite.config.ts) ke bagian DETAIL saja;
 * di tes (tsx) ia memuat JSON utuh yang sama dengan kotoba.ts, sehingga penggabungan tidak berpengaruh.
 */
import kotobaDetailJson from './db/kotoba.json';
import { KOTOBA_DATABASE } from './kotoba';
import { mergeKotobaDetails, type KotobaDetail } from './kotobaSplit';

mergeKotobaDetails(KOTOBA_DATABASE, kotobaDetailJson as Record<string, KotobaDetail>);
