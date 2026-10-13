# Roadmap (berdasarkan temuan, berurutan dependensi)

Kompleksitas: L rendah · M sedang · H tinggi. Setiap item memuat kriteria sukses yang dapat diuji.

## Gelombang 0 — keputusan yang dibutuhkan dari pemilik produk
| # | Keputusan | Opsi |
|---|---|---|
| K1 | Nilai `REWARD_POLICY` (flashcard 3×/hari, dst.) | setuju / ubah angka (satu file: `engine/reward/policy.ts`) |
| K2 | Misi tanpa pemicu: `dm_04` (Choukai off), `wm_01` (Stage), `wm_03` (Dokkai sempurna), `wm_04` (Boss) | (a) sambungkan ke fitur hidup — mis. `wm_01` ← clear lantai Tower, `wm_04` ← lantai Penjaga Tower, `wm_03` ← drill Dokkai sempurna di Library; (b) ganti misi; (c) sembunyikan |
| K3 | Terapkan `supabase/migrations/20261013_user_saves.sql` ke proyek live? | ya (via MCP/dashboard) / tidak |
| K4 | Dungeon membayar jawaban salah/waktu habis | pertahankan / bayar hanya benar |
| K5 | Tier leaderboard (murni EXP) vs tier in-app (digerbang) | samakan (kirim tier efektif) / biarkan |

## Gelombang 1 — integritas (sebelum fitur baru)
| # | Item | Reuse | File | Risiko | Kompleksitas | Kriteria sukses |
|---|---|---|---|---|---|---|
| 1 | Klasifikasikan sisa sumber reward ke ledger: Arcade (5), Dungeon (eventKey sudah; tambah batas harian total), drill Library, menulis kanji/kosakata, Fusion stage | `awardExp`, `REWARD_POLICY` | `components/arcade/*`, `dungeon/DungeonSessionRunner`, `library/*`, `fusion` | ekonomi berubah | M | tidak ada `legacy_unclassified`/`study_unclassified` baru di ledger pada alur normal; tes per sumber |
| 2 | Batas EXP harian per keluarga sumber (mis. tryout, arcade) | ledger `rewardClaims` | `policy.ts`, `ledger.ts` | UI "+X EXP" harus mengikuti keputusan | M | main 40 tryout berturut ⇒ EXP harian ≤ cap |
| 3 | Rekonsiliasi EXP multi-perangkat dengan ledger | `mergeRewardState` | `useCloudSync`, `cloudMerge` | tinggi (data pemain) | H | dua perangkat offline → login ⇒ EXP = dasar + entri unik dari kedua sisi |
| 4 | Skor mingguan: kirim `quiz_answer` dari Library/Arcade/Recall atau turunkan dari ledger | `sendScoreEvent`/RPC v2 | `lib/supabase`, `RecallModule` | rate-limit 40/menit | M | benar di Library menambah `weekly_scores` +10 |
| 5 | Terapkan `user_saves` (K3) + lazy migration | kode sudah mendukung | `supabase/migrations`, `lib/supabase` | rendah (fallback ada) | L | `user_metadata.cloud_save` kosong setelah simpan berikutnya; reload memulihkan dari tabel |
| 6 | `nq_fusion_progress` → cloud atau klaim lifetime `fusion_stage` | `towerCloudState` pola | `engine/fusion/progress` | rendah | L | clear di perangkat A tak membayar penuh di B |
| 7 | Tes celah (rewards.ts, mastery, cloudMerge, ascension, kontrak SQL↔TS) + CI GitHub Actions (`npm test`, `tsc`, `vite build`) | `tsx --test` | `.github/workflows` | rendah | M | PR merah bila tes/typecheck gagal |

## Gelombang 2 — kebersihan & arsitektur
| # | Item | Kompleksitas |
|---|---|---|
| 8 | Hapus sisa mati: `templateDecks`, `entityAdapters`, `grammarHighlight`, `questionUtils`, `tower2/index`, ekspor mati `mastery.ts`, `engine/tower/*` lama + state Tower lama di `towerCloudState`, `stageProgress`/`data/world` | M |
| 9 | Pecah `usePlayerActions` per domain (reward, study, missions, profile, decks) + context untuk callback (kurangi prop-drilling) | M |
| 10 | Satukan deploy target (Vercel vs Cloudflare) atau generate salah satu dari yang lain | M |
| 11 | Pecah/lazy-load `data-kotoba` (8,5 MB) per level JLPT; indeks pencarian dibangun saat dibutuhkan | M |
| 12 | Rapikan dependensi, `package.json` name, `.env.example`; tambah CSP | L |

## Gelombang 3 — fitur baru yang kini aman dibangun
| Fitur | Bergantung pada | Catatan |
|---|---|---|
| Jembatan Tower → Recall (Room membawa `entityId`) | #3, desain konten Room | pulihkan makna "progres menara = penguasaan" |
| Dokkai/Choukai di Recall + `contextualSuccessCount` | #1, audio Choukai | mengaktifkan 20% komponen mastery |
| Achievement (event dari ledger) | #1 | ledger = sumber event |
| Streak freeze / pemulihan streak | streak berbasis belajar (selesai) | gold sink |
| Shop & gems (sink gold, perks tier yang nyata) | #2 | jangan sebelum batas EXP |
| Efek nyata STR/AGI/INT, perks tier | #1–2 | satu pengali di `awardExp` |
