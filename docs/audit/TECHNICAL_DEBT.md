# Bugs, Risks & Technical Debt

Status: **FIXED** (di PR #14, teruji) · **MITIGATED** (sebagian) · **OPEN** · **DECISION** (butuh keputusan produk).
Risiko: T tinggi · S sedang · R rendah.

## A. Integritas EXP & mastery
| ID | R | Temuan & bukti | Status |
|---|---|---|---|
| E-01 | T | Pembulatan `Math.round(totalExp+exp)` membuang EXP pecahan (flip 0,1–0,5) tetapi UI menampilkannya | **FIXED** `expFraction`; tes `expAward.test`, `playerProgress.test` A1–A4 |
| E-02 | T | Flip & Next flashcard ⇒ `recordItemAttempt(1/1)` sempurna 2×/kartu; kanji flashcard dihitung "menulis" (statistik & misi) | **FIXED** latihan ≠ attempt; tes B1–B6, M4 |
| E-03 | T | Dungeon flashcard membayar flip tiap toggle dan lagi di agregat akhir | **FIXED** sekali per kartu, dibayar sekali |
| E-04 | S | Layar hasil runner menampilkan lantai fiktif / total yang tak dibayar | **FIXED** (flashcard & menulis) |
| E-05 | T | Tidak ada ledger/idempotency; guard di state komponen (hilang saat remount/refresh), `Set` in-memory | **FIXED** untuk 12 sumber (lihat EXP_ECONOMY §3); **OPEN** untuk arcade, dungeon (hanya eventKey), drill/Library kuis, menulis, Fusion stage |
| E-06 | T | Conjugation Dojo 15 EXP tiap jawaban benar | **FIXED** 1×/(verb\|bentuk)/hari |
| E-07 | T | Simulasi ujian 10×skor (hingga 1.200 EXP) berulang tanpa batas | **MITIGATED** 1×/ujian/hari; **OPEN** batas total harian |
| E-08 | S | Next flashcard dibayar tanpa melihat jawaban | **FIXED** wajib dibalik; 3×/kartu/hari |
| E-09 | S | Recall: keluar di tengah sesi menghilangkan EXP sementara mastery tersimpan | **FIXED** bayar sesi ditinggalkan; `sessionKey` idempoten |
| E-10 | S | Recall "Latihan Ekstra" tanpa batas putaran (EXP penuh, `+2·INT` per sesi) | OPEN |
| E-11 | S | `DeckWritingRunner` & lantai flashcard dungeon mengirim "benar" tanpa penilaian nyata | OPEN |
| E-12 | R | Dungeon membayar jawaban salah/waktu habis (partisipasi) | DECISION |
| E-13 | R | Bonus INT tiga rumus berbeda; default `playerInt=10` pada prop | OPEN |
| E-14 | R | Keputusan UI dari snapshot render vs keputusan resmi di updater (dua event satu tick) | OPEN (kecil) |
| E-15 | S | `studyStats.*.uniqueIds` tumbuh tanpa batas dalam save/cloud; ascension memakainya sebagai fallback "dikuasai" | OPEN |

## B. Misi & streak
| ID | R | Temuan | Status |
|---|---|---|---|
| M-01 | T | Streak naik karena membuka app, bukan belajar | **FIXED** `touchActiveDay`/`expireStreak`; tes S1–S6 |
| M-02 | T | `wm_02` tak pernah maju; `wm_01`/`wm_02` mulai progres 1 gratis | **FIXED** `syncStreakMission` (hari berurutan minggu ini), progres awal 0 |
| M-03 | S | `dm_05` dobel-hitung (bunpou/kotoba/choukai + skor) dan deskripsi "berturut-turut" tak sesuai | **FIXED** hanya jawaban benar; deskripsi disesuaikan |
| M-04 | T | `dm_04`, `wm_01`, `wm_03`, `wm_04` tak punya pemicu hidup | **DECISION** dikunci tes `M5` (`MISSIONS_WITHOUT_LIVE_TRIGGER`): hubungkan/ganti/sembunyikan |
| M-05 | R | Recall menambah misi kotoba (≤5/sesi) untuk kategori apa pun | OPEN |
| M-06 | R | `lastActiveDate` default memakai tanggal UTC | **FIXED** tanggal lokal |

## C. Cloud, data & keamanan
| ID | R | Temuan | Status |
|---|---|---|---|
| C-01 | T | `user_saves` tidak ada ⇒ save penuh di `user_metadata.cloud_save` (ikut JWT) | **FIXED** tabel dibuat 2026-10-13 (RLS own-row; `anon` tanpa akses; `authenticated` select/insert/update saja); klien memigrasikan save lama saat simpan berikutnya (lazy). Sisa: pantau ukuran `user_metadata` lama & uji login perangkat kedua |
| C-02 | T | Jalur leaderboard lama pasti gagal di DB ini bila env `VITE_SECURE_LEADERBOARD` tak `'true'` | **FIXED** default true |
| C-03 | S | Event `quiz_answer` (skor mingguan) tak dikirim siapa pun (pengirim `QuizEngine` sudah mati sebelumnya) ⇒ arena mingguan hanya bertambah dari menulis kanji | OPEN |
| C-04 | S | Konflik multi-perangkat: EXP lebih besar menang, tidak dijumlah | OPEN — ledger memungkinkan rekonsiliasi |
| C-05 | S | `nq_fusion_progress` tak ikut cloud ⇒ clear pertama bisa diulang di perangkat baru (reward penuh) | OPEN |
| C-06 | S | `user_mastery` diisi skor sintetis (`retention=100`, `recognition=knowledge`) & tak dibaca balik | OPEN |
| C-07 | S | Tower: `handleTowerMastery` tak dipanggil; konten Room tak bawa ID materi ⇒ progres menara tak memengaruhi Recall/ascension | DECISION (butuh desain) |
| C-08 | S | Tier leaderboard (server, murni EXP) ≠ tier in-app (digerbang Ascend) | OPEN |
| C-09 | S | Tidak ada CSP; rate-limit `api/deck-topic` in-memory; `api/captions` pakai endpoint tak resmi | OPEN |
| C-10 | R | Anon key hardcode di `lib/supabase.ts` (publik by design; RLS+RPC terverifikasi) | diterima |
| C-11 | S | RLS policy `roles={public}` dengan `auth.uid()=user_id` (anon ⇒ nol baris); aman tetapi gunakan `TO authenticated` agar eksplisit | OPEN (kosmetik keamanan) |
| C-12 | R | Advisor Supabase (2026-10-13): *Leaked Password Protection* nonaktif (Auth); `submit_score_event` v1 tanpa `search_path` (tidak dapat dieksekusi, kosmetik); 24 tabel RLS-tanpa-policy (INFO, disengaja: hanya diakses RPC/service) | OPEN |

## D. Kode & arsitektur
| ID | R | Temuan | Status |
|---|---|---|---|
| D-01 | S | ±6.700 baris UI mati (Boss/Dokkai/Choukai/Kanji/Kotoba/Bunpou Module, QuizEngine, Sakubun, Tower UI lama) | **FIXED** dihapus (commit terpisah, dapat di-revert) |
| D-02 | R | Sisa tak terjangkau: `templateDecks`, `entityAdapters`, `grammarHighlight`, `questionUtils`, `tower2/index` (758 baris); ekspor mati di `mastery.ts` (`generateAdaptiveRecommendation`, `generateBossBattleDiagnostic`, `diagnoseDokkaiMistake`, `calculateOverallMastery`), `getLevelInfo` | OPEN |
| D-03 | S | `engine/tower/*` lama masih diekspor `engine/index.ts`; `towerCloudState` mengumpulkan state Tower lama ke cloud | OPEN |
| D-04 | S | `stageProgress`, `data/world/*`, `currentStageId`, `studyStats.stages/bossBattles/dokkai/choukai` tersisa tanpa penulis | OPEN |
| D-05 | S | `usePlayerActions` ±400 baris; prop-drilling callback 4–6 level | MITIGATED (logika inti kini fungsi murni) |
| D-06 | R | Dua target deploy (Vercel `api/` + Cloudflare `functions/`) dengan logika duplikat | OPEN |
| D-07 | R | Dependensi kemungkinan tak terpakai (`express`, `dotenv`, `jimp`, `esbuild`, `gh-pages`); `package.json` name `react-example`; `.env.example` merujuk file yang tidak ada | OPEN |
| D-08 | R | Dokumen yang dirujuk kode tidak ada: `docs/TOWER1_ARCHITECTURE.md`, `docs/TOWER2_ARCHITECTURE.md`, `supabase/migrations/20261001_*.sql` | OPEN |
| D-09 | S | Tanpa CI; tes hanya lokal | OPEN |
| D-10 | S | Chunk `data-kotoba` 8,5 MB | OPEN |
| D-11 | R | Tabel konten Supabase (kanji/vocabulary/grammar ±11.8k baris) tidak dipakai — salinan basi berpotensi menyesatkan | OPEN |
| D-12 | R | Tiga salinan konstanta level/tier (TS + 2 fungsi SQL) | OPEN (tambah tes kontrak) |
| D-13 | R | Tes UI hanya satu (`RecallModule.empty`); tak ada tes komponen runner/modal | OPEN |
