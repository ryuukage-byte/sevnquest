# Data Model & Data Flow

## 1. `PlayerStats` (satu objek; `src/types/rpg.ts`) ✅
| Kelompok | Field | Catatan |
|---|---|---|
| Identitas | `userId`, `playerName`, `signature`, `avatar`, `characterGender` | `userId` = uuid lokal; saat login diganti `auth.uid()` |
| Progres | `level`, `totalExp` (bulat), `expFraction`, `tierIndex`, `tierPromotionGated`, `gatedReason`, `ascendedLevels` | level & tier diturunkan dari EXP (+ gerbang) |
| Atribut | `hp/maxHp`, `mp/maxMp`, `str/agi/int/vit`, `unallocatedPoints` | MP tanpa regenerasi |
| Ekonomi | `gold`, `gems`, `inventory[]` (`pot_hp_small`, `scroll_exp_sm`) | `scroll_exp_sm` tidak pernah dikonsumsi; gems tak bisa didapat |
| Streak | `streakDays`, `longestStreak`, `totalActiveDays`, `lastActiveDate` | **berbasis belajar** (`state/streak.ts`) |
| Waktu belajar | `todayStudySeconds`, `totalStudySeconds`, `lastStudyDate` | ditulis `StudyTimerBadge` via `useStudyTimeTracker` |
| Statistik | `studyStats` = {questions, flashcards, kanjiWriting, tryOuts, dokkai, choukai, bunpou, stages, bossBattles} masing-masing `{total, uniqueIds[]}` | `uniqueIds` tumbuh tanpa batas 🔶; dokkai/choukai/stages/bossBattles tidak lagi ditulis UI hidup |
| Mastery | `itemMastery: Record<itemId, ItemMasteryRecord>` | sumber kebenaran belajar (lihat §2) |
| Turunan | `recallQueue` | **tidak disimpan**; dibangun ulang |
| Recall | `recallDaily {date, answered, newTested, sessions}` | disimpan & di-merge (maks per field) |
| Reward | `rewardLedger[≤200]`, `rewardClaims{key→{n,at,until?}}` | baru (PR #14) |
| Deck | `userDecks: UserDeck[]` (+ deck bawaan `default_bookmark`) | |
| Preferensi | `soundEnabled`, `theme`, `speechRate`, `furiganaEnabled`, `targetJlpt`, `equippedSkin`, `unlockedSkins` | |
| Tak terpakai | `currentWorldId/MapId/StageId`, `stageProgress`, `currentExp/maxExp`, `overallMasteryPercentage`, `categoryMastery`, `totalMasteredItems`, `totalPerfectedItems`, `errorHistory`, `languageProfile`, `equippedTitle`, `selectedSkinId` | tersisa dari desain lama 🔶 |

## 2. `ItemMasteryRecord` ✅
`itemId` (ID kanonik), `category`, `status` (LOCKED/AVAILABLE/LEARNING/COMPLETED/MASTERED/PERFECTED), `masteryPercentage`, `masteryLevel` 1–5, `firstAttemptScore`, `bestScore{score,total}`, `bestScoreAchievedAt`, `attemptsCount`, `writingCount`, `flashcardCount`, `quizCount`, `recallCount`, `viewCount`, `consecutivePerfects`, `mistakeCount`, `lastReviewedAt`, `nextReviewDue`, `reviewIntervalDays`, `decayFactor` (selalu 1.0), `weaknessFlags`, `errorPatterns`, `contextualSuccessCount`, `lastInteraction{type,source,at}`.

Definisi perilaku (`utils/mastery.ts`):
| Peristiwa | Fungsi | Efek |
|---|---|---|
| Membuka materi | `recordItemInteraction('view')` | `viewCount` saja |
| Menulis/flashcard tanpa skor | `recordItemInteraction('writing'\|'flashcard')` | counter + `lastReviewedAt`; **bukan attempt**; SRS/skor/streak tetap; dedupe 3 dtk per (jenis, asal) |
| Jawaban bernilai | `recordItemAttempt` | pertama: mastery `round(rasio·70)`, interval 1 (2 bila sempurna); berikutnya: 20% best (half-life 30 hari) + 25% akurasi + 20% streak/5 + 15% kesegaran + 20% kontekstual (hanya bila ada) |
| Status | PERFECTED ≥98% & ≥3 attempt & ≥2 perfect & interval ≥4 · MASTERED ≥80% & ≥2 attempt · COMPLETED rasio ≥0,7 atau mastery ≥60 · else LEARNING |
| Interval SRS | `[1,2,4,7,14,30]` hari; sempurna → naik (`consecutivePerfects`); <60% → 1; sebagian → turun satu anak tangga |
| Recall | benar = 7/7, salah = 4/7 (<0,6 ⇒ reset 1 hari) |
Pembeda: *visited* (view) ≠ *practiced* (counter>0) ≠ *attempted/tested* (`quizCount`/`recallCount`>0) ≠ *completed/mastered/perfected* (ambang di atas).

## 3. Penyimpanan klien (localStorage) ✅
| Key | Isi | Ikut cloud |
|---|---|---|
| `nihongo_quest_player_stats_v2` | `PlayerStats` (tanpa `recallQueue`) | ya |
| `nihongo_quest_stage_progress_v2` | stage (mati) | ya |
| `nihongo_quest_daily_missions_v2`, `…weekly_missions_v2` | misi | ya (dipakai bila periode sama) |
| `n3quest_last_daily_reset`, `…weekly_reset`, `…last_cloud_sync` | penanda | tidak |
| `nihongo_quest_player_signature`, `…onboarding_completed`, `…home_guide_seen` | UI | tidak |
| `nq_tower1_progress` | lantai Tower 1/2 selesai (bintang, akurasi, percobaan) | ya (`towerCloudState`) |
| `nq_tower1_rooms` | progres Room di lantai | tidak |
| `nq_fusion_progress` | clear Fusion | **tidak** |
| `nq_tower_progression`, `nq_tower_skill_economy`, `nq_tower_achievements_state`, `nq_tower_active_checkpoint` | Tower lama (UI dihapus) | tiga pertama masih ikut cloud |
| `nihongo_quest_leaderboard_*` cache, `nihongo_quest_smart_rnd_*`, `nq_stroke_*`, `sevnquest.immersion.*`, `nihongo_quest_ai_deck_prefs`, `bunpou_library_view_mode`, `nq_visitor_id`, `nq_visitor_last_ping`, `nq_fusion_reduce_motion` | cache/preferensi | tidak |
Penulisan lewat `safeSetItem` (tangani QuotaExceeded dengan toast). Debounce 1 dtk + flush saat `visibilitychange/pagehide`.

## 4. Supabase — **terverifikasi langsung** (proyek `iokhdhqnpslpwsxspvaj` "sevnquestnihongo", ap-southeast-1, Postgres 17; kueri katalog read-only, 2026-10-13)
### 4a. Tabel yang dipakai aplikasi
| Tabel | Baris | RLS | Policy | Penulis |
|---|---|---|---|---|
| `leaderboard` (PK `user_id` text; `exp_credit_at`) | 707 | ON | SELECT publik saja | RPC `upsert_leaderboard_entry`, `nq_reset_my_leaderboard` |
| `weekly_scores` (unik `user_id,week_id`) | 233 | ON | SELECT publik saja | RPC `submit_score_event_v2` |
| `score_event_log` | 4.960 | ON | tanpa policy (hanya RPC) | RPC (rate-limit/dedupe; dibersihkan >1 hari) |
| `user_mastery` (unik `user_id,entity_type,entity_id`) | 224 | ON | ALL `auth.uid()=user_id` | klien (`syncUserMasteryRelational`) |
| `user_activity` | 14.996 | ON | ALL `auth.uid()=user_id` | klien (`logUserActivityEvent` dari `sendScoreEvent`) |
| `app_visitors` | 1.837 | ON | tanpa policy | RPC `register_visit` |
### 4b. Tabel ada tetapi tidak dibaca aplikasi
`kanji` (2.306), `vocabulary` (8.635), `grammar` (915), serta `question, sentence(+_vocabulary,_grammar), reading, listening, vocabulary_(audio|writing|relation), kanji_writing, tag, entity_tag, curriculum, map, stage, stage_content, relation, content_version, source, entity_source, user_srs` (0 baris). Konten aplikasi dibaca dari JSON bundel; tabel konten adalah salinan/rencana. **`user_saves` tidak ada** ✅.
### 4c. RPC (semua `SECURITY DEFINER`, `search_path=public` kecuali v1)
| Fungsi | Eksekusi | Perilaku |
|---|---|---|
| `submit_score_event_v2(event_type, ref_id, is_correct, name, tier)` | authenticated | `auth.uid()`; event hanya `quiz_answer`/`kanji_write`; ≤40 event/menit; dedupe (user,type,ref) 10 dtk; benar → `weekly_scores.score += 10` |
| `upsert_leaderboard_entry(name, level, total_exp, avatar, stat_*)` | authenticated | validasi; **kenaikan EXP dibatasi 400/menit** dgn kredit terakumulasi ≤60 menit; level & tier dihitung server dari EXP; stat tidak turun |
| `submit_score_event(...)` v1 (terima `p_user_id` dari klien, +10/+15/+5 EXP) | **tidak ada role yang boleh** ✅ (terkunci migrasi `sec03_*`) | — |
| `nq_reset_my_leaderboard()` | authenticated | reset baris sendiri |
| `register_visit(uuid)` | anon+authenticated | hitung kunjungan (≥30 menit antar-hitungan) |
| `nq_level_for_exp`, `nq_tier_for_exp` | — | identik dengan TS |
### 4d. Migrasi remote vs repo
Remote: `sec03_1a_prep, sec03_1b_functions, sec03_1c_grants, sec03_purge_guest_leaderboard, app_visitors_counter, sec03_2_lock, sec03_2b_revoke_leftover_grants`. Repo sebelumnya **tanpa** folder migrasi (kode merujuk file yang tidak ada). Kini ada `supabase/migrations/20261013_user_saves.sql` (**usulan, belum diterapkan**).
Dampak penting: jalur lama klien (`SECURE_LEADERBOARD=false`) pasti gagal di DB ini → default klien diubah ke `true`.

## 5. Alur sinkron ✅
```mermaid
sequenceDiagram
  participant App
  participant LS as localStorage
  participant SB as Supabase
  App->>LS: debounce 1s / flush hidden
  App->>SB: login → loadGameFromCloud (user_saves + user_metadata, yang updatedAt lebih baru)
  alt tidak ada save
    App->>SB: saveToCloud(state lokal)
  else ada
    App->>App: cloudWins = cloudExp>localExp || cloudLevel>localLevel
    App->>App: skalar dari pemenang; union itemMastery/userDecks/recallDaily/rewardLedger/rewardClaims/stage/tower
    App->>LS: simpan hasil gabungan
    App->>SB: (bila lokal menang/sama) push snapshot gabungan
  end
  loop autosave ≥30 dtk (setelah cloudHydrated)
    App->>SB: saveGameToCloud → upsert_leaderboard_entry (+ user_mastery background)
  end
```
Penyimpanan save penuh: **`user_metadata.cloud_save`** (karena `user_saves` belum ada) → ikut JWT; `loadGameFromCloud` membaca dual (tabel + metadata). Kegagalan baca dilempar agar cloud tidak tertimpa.

### Konflik & risiko
| # | Kasus | Hasil |
|---|---|---|
| 1 | Dua perangkat belajar offline lalu login | EXP lebih besar menang; gold/gems/inventory/atribut/streak sisi kalah hilang; EXP dua sisi tidak dijumlah |
| 2 | Klaim reward di sisi yang kalah | penanda di-union ⇒ klaim tidak bisa diulang, tetapi EXP-nya hilang (belum direkonsiliasi lewat ledger) |
| 3 | `itemMastery` | record dengan `lastReviewedAt` lebih baru menang (per item) |
| 4 | `recallDaily` | hari terbaru menang; hari sama → maks per field |
| 5 | Misi | dipakai dari cloud hanya bila cloud menang dan tanggal/minggu sama |
| 6 | `user_mastery.retention_score` = `decayFactor·100` (=100 selalu); `recognition_score = knowledge_score = masteryPercentage` | data relasional tidak informatif; tidak pernah dibaca balik (`loadUserMasteryRelational` tak dipanggil) |
| 7 | `user_activity` | hanya `quiz_answer`/`kanji_write`; `quiz_answer` tak lagi dikirim |

## 6. Validasi & otorisasi
- Klien: sanitasi nama/signature (panjang), `canonicalEntityId`, clamp skor di `recordItemAttempt`, `applyExpGain` menolak NaN/negatif.
- Server: lihat §4c; RLS `auth.uid()` pada tabel user; leaderboard publik-baca. Anon key hardcode di klien (publik by design) — keamanan bergantung pada RLS+RPC yang terverifikasi di atas.
- `api/deck-topic`: sanitasi keluaran LLM, rate-limit in-memory (tidak andal di serverless), timeout 8 dtk. `api/captions`: validasi ID 11 karakter, timeout 8 dtk.
