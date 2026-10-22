/**
 * Data "lengkap" yang tidak dibutuhkan tampilan pertama: detail kotoba (contoh kalimat, kolokasi, definisi)
 * dan bank soal kanji & bunpou (±1,9 MB terkompresi). Chunk awal hanya memuat materi inti; sisanya dimuat
 * di latar belakang setelah aplikasi tampil dan digabung ke objek basis data yang sama (in place).
 *
 * Jaminan: setiap komponen lazyWithRetry menunggu `ensureFullData()` sebelum dirender, jadi layar lazy
 * selalu melihat data lengkap. Kode jalur boot (App, Home, Misi, antrean Recall awal) hanya boleh membaca
 * field inti; antrean Recall dibangun ulang begitu data lengkap siap (lihat useFullData).
 */
let pending: Promise<void> | null = null;
let ready = false;

export function isFullDataReady(): boolean {
  return ready;
}

export function ensureFullData(): Promise<void> {
  if (ready) return Promise.resolve();
  if (!pending) {
    pending = Promise.all([import('./kotobaDetails'), import('./kanjiQuestions'), import('./bunpouQuestions')])
      .then(() => {
        ready = true;
      })
      .catch((err) => {
        pending = null; // izinkan percobaan ulang (lazyWithRetry / pemanggilan berikutnya)
        throw err;
      });
  }
  return pending;
}
