# Testing & Verification

## Dijalankan (2026-10-13, HEAD branch PR #14) ✅
| Perintah | Hasil |
|---|---|
| `npm ci` | sukses |
| `npm test` (`tsx --test`, 22 file) | **205 lulus / 0 gagal / 0 dilewati** |
| `npx tsc --noEmit` | exit 0 (bersih) |
| `npx vite build` | sukses (±16 dtk) |
| Awal audit (HEAD `8ae7fc1`) | 148/148 lulus, `tsc` bersih |
Tidak dijalankan: aplikasi di browser, Playwright/e2e, Lighthouse, uji beban, uji dengan akun Supabase nyata.

## Tes per file
| File | Tes | Cakupan |
|---|---|---|
| `src/engine/reward/reward.test.ts` | 22 | keputusan reward, event ganda, batas harian/lifetime/periode, ttl, cap ledger, awardExp, StrictMode, merge lintas perangkat, reload |
| `src/state/playerProgress.test.ts` | 15 | EXP pecahan & level, gold, reload/save lama, flashcard bukan attempt, dedupe, SRS tak bergeser, benar/salah, ID agregat, misi |
| `src/state/missions.test.ts` | 12 | misi, streak, sinkron streak mingguan, daftar misi tanpa pemicu |
| `src/utils/expAward.test.ts` | 8 | carry pecahan, drift, input invalid, format, aturan flip |
| `src/utils/recallHistory.test.ts` | 17 | riwayat → antrean Recall, engine, merge mastery |
| `src/engine/tower1/tower1.test.ts` | 28 | graf DAG, unlock, rekomendasi, konten lantai |
| `src/engine/tower1/tower2.test.ts` | 4 | rencana Menara 2 |
| `src/engine/search/universalSearch.test.ts` | 14 | pencarian |
| `src/engine/fusion/fusion.test.ts` | 14 | engine Fusion |
| `src/engine/deck/deckBuilder.test.ts` | 12 | pembangun deck |
| `src/engine/textStudy/*` (captionAnalysis 7, immersionTemplate 8, textAnalyzer 5, wordTiming 5) | 25 | analisis teks/caption |
| `src/engine/recall/session.test.ts` | 5 | kuota Recall |
| `src/engine/morphology/inflectionEngine.test.ts` | 6 | konjugasi |
| `src/components/learning/RecallModule.empty.test.tsx` | 7 | empty state Recall |
| `src/data/bunpou.golden.test.ts` | 2 | integritas data bunpou |
| `src/utils/{youtube 5, weekId 3, kanjiWritingRecord 3}.test.ts`, `api/captions.test.ts` 3 | 14 | util |

## Celah (belum ada tes)
1. Rumus `rewards.ts` (base EXP per jenis, `calculateWritingReward`, `calculateQuizReward`) — nilai tabel belum dikunci.
2. `recordItemAttempt` jalur lengkap (transisi status, half-life, interval) selain yang tersentuh `recallHistory`/`playerProgress`.
3. `cloudMerge` (`mergeStageProgress`, `mergeUserDecks`, kasus `cloudWins`) & `useCloudSync` (butuh mock Supabase).
4. `ascension` (gerbang 75%, fallback `uniqueIds`).
5. Kontrak SQL ↔ TS (`nq_level_for_exp`/`nq_tier_for_exp` vs `calculateLevelFromExp`/`RPG_TIERS`).
6. Komponen runner/modal (tidak ada tes DOM): perilaku "Next tanpa flip", tampilan hasil, Dojo "hadiah ditolak".
7. e2e: refresh di tengah sesi, dua tab, offline→online, login di perangkat kedua.
8. Migrasi `user_saves` (skenario tabel ada/tidak ada, lazy migration `user_metadata`).
