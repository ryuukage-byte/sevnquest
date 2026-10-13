# EXP, Level, Tier & Reward Economy

Semua angka dari kode ✅ kecuali ditandai. Lokasi: `src/utils/rewards.ts`, `src/data/rpg/tiers.ts`, `src/engine/reward/*`, `src/state/playerProgress.ts`.

## 1. Representasi EXP (setelah PR #14)
- `totalExp` = **bilangan bulat**. Sisa pecahan di `expFraction ∈ [0,1)`; dibawa ke reward berikutnya (`utils/expAward.ts`, satuan mikro-EXP, tanpa drift float).
- Level, tier, leaderboard, cloud membaca `totalExp` bulat; tampilan EXP = `totalExp` (nilai yang benar-benar tersimpan). Sisa pecahan tidak ditampilkan.
- Sebelum PR: `Math.round(totalExp + exp)` membuang setiap reward < 0,5 (mikro-EXP flip kartu).

## 2. Rumus inti
| Hal | Rumus |
|---|---|
| Level | `L = max(1, ⌊(−1 + √(9 + 0,16·EXP)) / 2⌋)`; EXP awal level L = `25L² + 25L − 50` (diverifikasi saling-invers) |
| Contoh | L2 = 100 · L5 = 700 · L10 = 2.700 · L20 = 10.450 · L30 = 23.200 · L50 = 63.700 · L100 = 252.450 |
| Poin atribut | 3 per level naik (`ATTRIBUTE_POINTS_PER_LEVEL`) |
| Max HP / MP | `100 + 10L + 15·VIT` / `40 + 5L + 8·INT` |
| Tier (EXP → level) | T1 0 (L1) · T2 1.200 (L6) · T3 4.000 (L12) · T4 10.000 (L19) · T5 22.000 (L29) · T6 45.000 (L41) · T7 80.000 (L56) · T8 135.000 (L73) · T9 210.000 (L91) · T10 320.000 (L112) |
| Gerbang Ascend | tier tertahan di 2/4/6/8 (indeks 1/3/5/7) sampai kanji, kotoba, bunpou level itu masing-masing ≥ 75% **dan** rata-rata ≥ 75%, lalu pemain menekan Ascend. "Dikuasai" = `masteryPercentage ≥ 70` atau MASTERED/PERFECTED, atau (bila belum punya record) ID ada di `studyStats.*.uniqueIds` |
| Server (SQL) | `nq_level_for_exp` identik dengan TS ✅; `nq_tier_for_exp` memakai ambang yang sama ✅ (tier leaderboard = tier murni-EXP, **tanpa** gerbang Ascend → bisa berbeda dari tier in-app) |

### Base EXP per materi
| Jenis | Rumus | Rentang aktual (dari data) |
|---|---|---|
| Kanji | `levelBase(KANA/SUUJI 12 · N5 20 · N4 30 · N3 45 · N2 65 · N1 90) + round(2,5·goresan)` | KANA 15–27 (avg 19,6) · N5 15–58 (33,6) · N4 35–75 (51,6) · N3 53–95 (69,5) · N2 45–115 (90,1) · N1 93–163 (118,9) |
| Kotoba | `levelBase(N5 15 · N4 22 · N3 32 · N2 48 · N1 65) + 2·panjang + 5·jumlahKanji` | N5 19–52 (25,3) · N4 24–54 (33,1) · N3 34–65 (43,4) · N2 52–76 (61,7) · N1 67–132 (79,4) · Kaigo avg 32,2 · SSW avg 44,6 |
| Bunpou | `levelBase(N5 25 · N4 35 · N3 50 · N2 70 · N1 95) + 5·subFormula` | N5 30–55 (34,5) · N4 40–60 (45,5) · N3 55–75 (60,1) · N2 75–100 (80,1) · N1 100–130 (105,4) |
| Kuis per soal | N5 18 · N4 25 · N3 35 · N2 50 · N1 70 | — |

### Multiplier engine (`ENGINE_EXP_MULTIPLIER`)
flip 0,005 · flashcard 1,0 · quiz 1,2 · writing 1,5 · sentence 2,0 · recall 1,0 · arcade 0,35.
- **Menulis**: `perf = clamp(mult/1,2 ; 0,8 ; 1,25)`; `mult = 1,2 +0,35 (tanpa watermark) +0,25 (tanpa animasi; −min(0,2;(n−1)·0,08) bila >1) +0,25 (0 salah; −min(0,3;(n−2)·0,05) bila ≥3) +0,10 (waktu 2…max(25;6·goresan) dtk)`. Gold 0.
- **Kuis**: `max(10, round(benar · basePerSoal · 1,2 · akurasi{=100% ×1,3; ≥80% ×1,1; <60% ×0,8; lain ×1} · (1+0,005·INT)))`, gold `max(5, exp/2)`.

## 3. Ledger reward (baru) — `engine/reward/*`
Pintu tunggal `awardExp(stats, {source, ref?, eventKey?, exp, gold, note?})`:
1. `exp`/`gold` tak valid/≤0 → ditolak `empty`.
2. `eventKey` sudah pernah (2 hari) → `duplicate_event`.
3. Kunci batas `lim:<source>:<ref>[:<hari>]` mencapai `limit` → `limit_reached`.
3b. **Batas EXP harian keluarga** (`FAMILY_DAILY_EXP_CAP`): sisa batas hampir habis → diberikan sebagian (`capped`); habis → `daily_cap`. Latihan tetap tercatat di mastery.
4. Diberikan → `applyRewardToStats` (EXP pecahan, level, tier) + tandai hari aktif (streak) kecuali `mission_claim` + catat `rewardLedger` (≤200) & `rewardClaims`.
Keputusan resmi diambil di dalam updater `setStats` (atomik terhadap panggilan beruntun); UI memakai pratinjau dari snapshot render.

### Kebijakan (`REWARD_POLICY`) — nilai awal, mohon dikonfirmasi
| Sumber | Cakupan | Batas | Mengganti |
|---|---|---|---|
| `flashcard_flip` | hari × kartu | 1 | "sekali per sesi" |
| `flashcard_complete` | hari × kartu | 3 | tak terbatas |
| `bunpou_detail_quiz`, `entity_quiz` | hari × materi | 1 | "sekali per buka modal" |
| `conjugation_dojo` | hari × (verb\|bentuk) | 1 | 15 EXP tiap benar |
| `fusion_free` | hari × (pola\|verb) | 1 | `Set` in-memory |
| `tower_floor` | selamanya × lantai | 1 | state komponen |
| `mission_claim` | misi × periode (ttl 8 hari) | 1 | flag `claimed` |
| `tryout_exam` | hari × ujian | 1 | tak terbatas |
| `text_study_entity` | hari × entitas | 1 | `Set` modul-level |
| `fusion_stage_first` | selamanya × stage, keluarga `fusion` | 1 | state lokal `nq_fusion_progress` |
| `fusion_stage_repeat` | hari × stage, keluarga `fusion` | 5 | tanpa batas (40% hadiah) |
| `arcade_*` (5 mode) | keluarga `arcade` | EXP harian 1.500 | tanpa batas |
| `dungeon_session` | eventKey = ID sesi; keluarga `dungeon` | EXP harian 3.000 | tanpa batas |
| `drill_session` | keluarga `drill` | EXP harian 1.500 | tanpa batas |
| `writing_practice` | hari × materi (5), keluarga `writing` | EXP harian 2.000 | tanpa batas |
| `tryout_exam` | + keluarga `tryout` | EXP harian 2.400 (≈2 ujian penuh) | — |
| `recall_extra` (Latihan Ekstra) | keluarga `recall_extra` | EXP harian 500 | tanpa batas |
| `recall_session` (jatah normal), `study_unclassified`, `legacy_unclassified` | — | tanpa batas (dicatat); jatah normal sudah dibatasi 40 jawaban/hari oleh `engine/recall/session` | — |

## 4. Tabel sumber EXP (kondisi pasca-PR)
| Aktivitas | Kondisi | EXP | Bonus/batas | Pemberi | Penyimpanan |
|---|---|---|---|---|---|
| Flip flashcard (Buku Saku) | pertama kali ke sisi jawaban | `base·0,005` (0,1–0,8) | 1×/kartu/hari | `onReward` → `flashcard_flip` | ledger + `expFraction` |
| Selesai kartu (Next) | kartu pernah dibalik | `base·1,0` | 3×/kartu/hari; Next tanpa flip = 0 | `flashcard_complete` | + latihan flashcard (bukan attempt) |
| Flip di dungeon flashcard | pertama kali per kartu | `base·0,005` | masuk akumulasi, dibayar sekali di akhir | `study_unclassified` (eventKey sesi) | — |
| Menulis kanji/kosakata | sheet/kata selesai | `base·1,5·perf` | `hasRewardedRef` per sheet | `handleStudyComplete` | attempt `writing` (skor ≥60 ⇒ 1/1) |
| Kuis Library (drill) | akhir drill | rumus kuis | — | `study_unclassified` | `questions` |
| Simulasi ujian | submit | **10 × skor skala (maks 120 saat Choukai off)** = hingga 1.200 EXP, gold ½ | 1×/ujian/hari | `tryout_exam` | `tryOuts` |
| Dungeon (7 tipe) | akhir semua lantai | Σ per-lantai (20/10 default; 10/5 salah/waktu habis; 15/8; 30/15; 35/18) — **dibayar walau salah** | sesi unik (eventKey) | `study_unclassified` | agregat (tanpa mastery) |
| Text Study | akhir kuis | `base·1,2` per entitas benar | 1×/entitas/hari | `text_study_entity` | — |
| Arcade Kanji/Kotoba | tiap benar | `max(1,round(base·0,35))` | tak terbatas selama bermain | `study_unclassified` | attempt 1/1 |
| Arcade Sudden Death | tiap benar | + `min(streak,10)` | 3 nyawa | idem | attempt |
| Arcade Conjugation Rush | akhir 60 dtk | `max(30, benar·30+combo·10)` | — | idem | agregat |
| Arcade Star Sentence | klaim | 30/60/90/120/160/200 | `hasClaimedReward` per mount | idem | `tryOuts` |
| Conjugation Dojo | jawaban benar | 15 EXP / 10 gold | 1×/(verb\|bentuk)/hari | `conjugation_dojo` | — |
| Soal detail Bunpou / Entity | benar pertama | 15/10 · 15/5 | 1×/materi/hari | `bunpou_detail_quiz` · `entity_quiz` | attempt (Bunpou) |
| Recall | sesi selesai **atau ditinggalkan** | Σ `base·1,0` (sentence ×2) + `round(2·INT)` (sesi selesai) | 40 jawaban/hari + Ekstra tanpa batas; sessionKey idempoten | `recall_session` | mastery per jawaban |
| Grammar Fusion | stage selesai | stage 60 EXP × (1−0,1·hint−0,05·salah, min 0,5); ulang ×0,4 | free: 1×/kombinasi/hari | `fusion_stage` · `fusion_free` | `nq_fusion_progress` (lokal) |
| Tower 1/2 | clear pertama | 40–… (total 23.098 untuk 100 lantai) | selamanya 1× per lantai, lintas perangkat | `tower_floor` | `nq_tower1_progress` + ledger |
| Misi | klaim | harian 75–120; mingguan 400–600 | 1×/periode | `mission_claim` | misi + ledger |
| Streak / achievement / combo global | — | **tidak ada** | | | |

## 5. Perhitungan ekonomi (indikatif, dari data)
- **Total EXP "sekali baca" seluruh materi** (Σ base): kotoba ≈ 1.243.000 · kanji ≈ 236.800 · bunpou ≈ 65.400 → jauh melampaui T10 (320.000). Ekonomi tidak membatasi total, hanya laju.
- **Menara** menyumbang 23.098 EXP sekali seumur hidup ≈ T5 (22.000).
- **Recall harian maksimum (normal)**: 40 jawaban × ~25–80 EXP ≈ 1.000–3.200 EXP/hari bila semua benar, plus Latihan Ekstra (5 soal/putaran, tanpa batas).
- **Misi**: harian maks 465 EXP (semua 5 selesai); mingguan 1.950 EXP bila semua selesai, tetapi saat ini hanya wm_02 (500) yang dapat diselesaikan → ±500/minggu.
- **Satu simulasi ujian N3** ≈ 1.200 EXP ≈ 8 hari Recall penuh pada rate bawah — kini 1×/ujian/hari; dengan 37 ujian, satu hari bisa menghasilkan ±44.000 EXP bila semua ujian dikerjakan 100% (sinyal bahwa `tryout_exam` perlu batas harian *total*, bukan hanya per ujian) 🔶.
- **Leaderboard server**: kredit naik maksimal 400 EXP/menit, akumulasi dibatasi 60 menit (≤24.000 EXP per ledakan) ✅ — EXP klien yang melonjak dikreditkan bertahap; peringkat bisa tertinggal dari EXP lokal.

## 6. Inkonsistensi tersisa
| Hal | Detail |
|---|---|
| Bonus INT | kuis +0,5%/poin; Recall +2 EXP flat/poin per sesi (bahkan 0 benar); `SakubunStudio` +2%/poin (komponen sudah dihapus) |
| Default `playerInt = 10`/`playerStr = 10` pada prop `BukuSakuView` vs `stats.int` default 0 | harus diseragamkan |
| Tier in-app (digerbang) vs tier leaderboard (murni EXP) | tampilan berbeda untuk pemain yang tertahan Ascend |
| Perks tier & STR/AGI | teks saja |
| Dungeon membayar partisipasi (jawaban salah/waktu habis) | dokumentasikan atau ubah |
| Reward gold: tak ada sink kecuali Dojo; gems tidak dapat diperoleh | |
| Tiga salinan konstanta level/tier (TS, SQL level, SQL tier) | konsisten sekarang; rawan drift |
