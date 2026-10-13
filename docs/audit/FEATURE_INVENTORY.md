# Feature Inventory

Status: **C** complete · **P** partial · **U** UI-only/terputus · **D** dead (tidak terjangkau) · **?** belum dipastikan.
Bukti: ✅ kode/eksekusi · 🔶 pembacaan struktur (belum dijalankan di browser).

## 1. Shell & navigasi
| Fitur | Lokasi | St | Catatan / bukti |
|---|---|---|---|
| Boot splash + retry muat modul | `main.tsx`, `common/BootSplash` | C ✅ | |
| Header + timer belajar harian | `App.tsx`, `layout/StudyTimerBadge`, `hooks/useStudyTimeTracker` | C ✅ | Timer hanya jalan saat Recall/Library/Buku Saku aktif (`isStudying`) |
| Navigasi bawah 7 tab: Castle, World, Misi, Rank, Library, Buku Saku, Menu | `layout/BottomNavigation`, `hooks/useAppNavigation` | C ✅ | tipe `'weekly'` dipetakan ke tab Misi; tipe `'shop'` ada tetapi tak ada UI ✅ |
| Tombol back / state tab keep-alive | `useBackButton`, `FreezeWhenHidden`, `ModuleBoundary` | C 🔶 | |
| Error boundary global + per-modul | `ErrorBoundary`, `ModuleBoundary` | C ✅ | |
| Toast cloud/level-up | `hooks/useToast` | C ✅ | |
| Onboarding spotlight tour + panduan awal | `tutorial/SpotlightOnboarding`, `home/StartGuideModal` | C 🔶 | key `nihongo_quest_onboarding_completed`, `…home_guide_seen` |
| Pasang PWA | `pwa/PwaInstallModal`, `public/sw.js` | C 🔶 | |

## 2. Home (Castle)
| Fitur | Lokasi | St | Catatan |
|---|---|---|---|
| Sapaan, EXP, streak, tombol Recall + jumlah antrean | `home/HomeView` | C ✅ | streak kini berbasis belajar |
| Pencarian fitur/materi universal | `home/FeatureSearch`, `engine/search/universalSearch` | C ✅ | tes ada (`universalSearch.test.ts`) |
| Rekomendasi adaptif | `utils/mastery.generateAdaptiveRecommendation` | D ✅ | diekspor, **tidak dipanggil** UI; menunjuk `targetStageId` yang tidak ada |

## 3. Karakter / profil
| Fitur | Lokasi | St | Catatan |
|---|---|---|---|
| Modal status: level, EXP, HP/MP, gold, atribut | `modals/CharacterStatusModal` | C ✅ | |
| Alokasi poin atribut STR/AGI/INT/VIT (3 poin/level) | `usePlayerActions.handleAllocateStat` | P ✅ | hanya INT (bonus kuis) & VIT/INT (maxHP/MP) berefek; STR/AGI tanpa efek di UI hidup |
| Ascension tier (gerbang 75% kanji/kotoba/bunpou) | `utils/ascension`, `handleAscendTier` | C ✅ | gerbang N5→N4→N3→N2→N1; N1 tanpa gerbang |
| Potion HP / Istirahat Dojo (bayar gold) | `utils/recovery` | P ✅ | HP praktis tidak pernah turun di UI hidup → fitur nyaris tak terpakai |
| Avatar tier (10 tier × 2 gender), skin | `avatar/TierAvatar`, `assets/avatars` | C 🔶 | `equippedSkin` default saja |
| Language profile & coverage | `utils/mastery.calculateLanguageProfile/calculateCoverage` | C 🔶 | |
| Nama, signature | `handleUpdateName/Signature` | C ✅ | nama ≤30, signature ≤60 |
| Studi kasus tier perks | `data/rpg/tiers.perks` | U ✅ | teks saja; tak ada efek |

## 4. Misi
| Misi | Pemicu hidup | St |
|---|---|---|
| dm_01 Bunpou (1 sesi) | `handleStudyComplete(bunpou)` | C ✅ |
| dm_02 Kotoba (5 kartu) | flashcard kotoba / Recall (≤5 per sesi) | C ✅ |
| dm_03 Kanji (3 lembar tulis) | menulis kanji (flashcard kanji **tidak** lagi dihitung) | C ✅ |
| dm_04 Choukai | Choukai nonaktif (`CHOUKAI_ENABLED=false`) | U ✅ |
| dm_05 Kuis (5 benar) | jawaban benar (`quiz`), tidak dobel | C ✅ |
| wm_01 Stage ×5 | tidak ada pemicu (peta stage tidak ada) | U ✅ |
| wm_02 Streak 5 hari | `syncStreakMission` dari streak belajar minggu ini | C ✅ |
| wm_03 Dokkai sempurna ×3 | pemanggil satu-satunya (DokkaiModule) dihapus | U ✅ |
| wm_04 Boss ×1 | pemanggil satu-satunya (BossBattleModule) dihapus | U ✅ |
Klaim: `handleClaimMission` → ledger `mission_claim` (sekali per misi per periode). Reset harian per tanggal lokal, mingguan per ISO-week lokal (`useDailyRollover`).

## 5. Library (Perpustakaan)
| Sub-fitur | Lokasi | St | Data |
|---|---|---|---|
| Kotoba: daftar, filter, detail, tulis kana/kanji, audio, bookmark ke deck | `library/KotobaLibraryView`, `KotobaDetailModal`, `learning/KotobaWritingPractice` | C 🔶 | 18.353 entri (N5 700 · N4 731 · N3 1.960 · N2 3.333 · N1 11.369 · Kaigo 229 · SSW 31) |
| Kanji: daftar, detail, kanvas menulis (stroke order, hint, watermark, stopwatch), kosakata terkait | `library/KanjiLibraryView`, `KanjiDetailModal`, `learning/KanjiWritingCanvas` | C ✅ | 2.507 entri (N5 80 · N4 167 · N3 366 · N2 378 · N1 1.373 · KANA 143) |
| Bunpou: daftar, detail (rumus, sub-formula, contoh, kuis kecil), Dojo Konjugasi, sandbox | `library/BunpouLibraryView`, `BunpouDetailModal`, `ConjugationDojoView`, `ConjugationSandboxModal` | C 🔶 | 915 pola (N5 119 · N4 189 · N3 132 · N2 208 · N1 267) |
| Soal: penjelajah soal, drill, simulasi ujian JLPT (Moji-Goi, Bunpou-Dokkai, Choukai tersembunyi) | `library/QuestionLibraryView`, `dungeon/DungeonBattleModule` | C 🔶 | bank soal: kanji_questions 7.754, bunpou_questions 2.525; tryout 27 resmi + 10 dalam-app |
| Choukai | flag `CHOUKAI_ENABLED=false` | U ✅ | masalah audio |
| Modal materi universal | `modals/UniversalEntityModal` | C ✅ | memakai reward langsung (kini lewat ledger sebagian) |

## 6. Buku Saku (deck)
| Sub-fitur | Lokasi | St |
|---|---|---|
| Deck bawaan "Bookmark", deck kustom (buat/ubah/hapus/impor bookmark) | `deck/BukuSakuView`, `CreateDeckModal`, `utils/decks` | C 🔶 |
| Preset otomatis (`generatePresetDeckItems`) & deck dari topik (engine tanpa LLM) | `engine/deck/deckBuilder` (tes ada) | C ✅ |
| Deck AI (LLM hanya memperluas kata kunci; materi tetap dari DB) | `AIDeckCustomizerModal`, `api/deck-topic`, `utils/aiDeckPrompt`, `deckAiClient` | C 🔶 (butuh env; tanpa env → 503 → fallback lokal ✅) |
| Buku resmi/tematik (`official_books` sub-tab) | `deck/BookshelfView`, `BookDetailView`, `data/officialBooks` (43 buku), `data/thematicBooks` | C 🔶 |
| Runner flashcard (flip, Next) | `deck/DeckFlashcardRunner` | C ✅ (diperbaiki PR #14) |
| Runner menulis | `deck/DeckWritingRunner` | P ✅ — mengirim "1/1 benar" tanpa skor nyata |
| Template deck | `data/templateDecks.ts` (341 baris) + `TemplateDeckDetailView` (stub, dihapus) | D ✅ data tak diimpor |

## 7. World
### 7a. Arcade (5 mode) — `components/arcade/*`
| Mode | Aturan | Reward | St |
|---|---|---|---|
| Kanji Speed Rush | 60 dtk, kanvas | `max(1, round(base·0,35))`/benar | C ✅ |
| Kotoba Guess | tebak kata | idem | C ✅ |
| Sudden Death Streak | 3 nyawa | `round(base·0,35)+min(streak,10)`, gold `5+streak/2` | C ✅ |
| Conjugation Speed Rush | 60 dtk | akhir: `max(30, benar·30+combo·10)` | C ✅ (hard-coded) |
| Star Sentence Rush | peringkat C…SSS | 30/60/90/120/160/200 | C ✅ (hard-coded) |
Pemilih sumber materi: `ArcadeSourceSelector`, `utils/arcadeSourceUtils`.

### 7b. Dungeon (11 jenis) — `components/dungeon/*`, `utils/dungeonGenerator`
Menulis aksara · Gerbang Ingatan (flashcard) · Kuil Tata Bahasa (sakubun) · Altar Konjugasi · Arena Kuis Cepat · Kanji Extreme (100 stage) · Kreasi Kalimat Pola · Papan Tulis Pola · Grammar Fusion · Perpustakaan Teks (Text Study) · Imersi (YouTube karaoke). Mode standar/survival (timer per lantai 15–60 dtk). Jumlah lantai 5–30. Reward akumulasi per lantai (default 20/10; nilai lain 10/5, 15/8, 30/15, 35/18) dibayar **sekali di akhir**; lantai yang salah/waktu habis tetap membayar sebagian (partisipasi) ✅.
- **Grammar Fusion**: 1 stage tertulis (`fusion-n5-naide-kudasai-01`, 60 EXP/30 gold) + mode bebas dari pola bunpou/verb pool; clear ulang 40% (`REPEAT_REWARD_RATIO`). Progres di localStorage `nq_fusion_progress` **tidak** ikut cloud.
- **Text Study**: analisis teks bebas/dokkai → kotoba+pola → kuis; reward per entitas per hari (ledger).
- **Imersi**: caption YouTube (`api/captions`, endpoint tak resmi, bisa diblokir), karaoke per kata, template JSON dari AI eksternal (`immersionTemplate`, divalidasi/sanitasi), kata tersimpan (`useSavedWords`).

### 7c. Tower — `components/tower1/*`, `engine/tower1/*`, `data/tower1`, `data/tower2`
100 lantai: Menara 1 (001–016, tutorial: aksara/bunyi/kata) dan Menara 2 (017–100: kotoba N5/N4, kanji, pola, konjugasi, penjaga tiap kelipatan 10). Semua `status: 'ready'`. Room: lesson, choice, pair, build, pick. Graf prasyarat (DAG) + rekomendasi lantai. Reward: clear **pertama** saja (total 23.098 EXP / 11.549 gold untuk 100 lantai). Progres `nq_tower1_progress` ikut cloud (union). **Tidak** memperbarui mastery/Recall/statistik (`handleTowerMastery` tak dipanggil; konten Room tidak membawa ID materi DB) ✅.
- "Nihongo Tower" lama (HP, boss gate, skill tree, rewardEngine, round engine): UI dihapus; sisa `engine/tower/*` masih diekspor lewat `engine/index.ts` dan state-nya (`nq_tower_*`) masih dikumpulkan ke cloud (`towerCloudState`) 🔶 → candidate cleanup.

## 8. Recall (SRS)
`learning/RecallModule`, `engine/recall/{session,bunpouEngines}`, `utils/mastery.buildSmartRecallQueue`. Antrean ≤30 (CRITICAL/WEAK/REVIEW/MAINTAIN + NEW_UNTESTED), sesi 10 soal, 40 jawaban/hari, 10 materi baru/hari, Latihan Ekstra 5 soal tanpa batas putaran. Engine soal: pilihan ganda kurasi, konteks, canvas menulis, flashcard (penilaian diri), Grammar Fusion, konjugasi, listening (kotoba), Dokkai/Choukai bila ada. Hasil → `handleItemReviewed` (mastery) & `handleCompleteRecallSession` (EXP, misi). C ✅ (tes: `recallHistory.test`, `session.test`, `RecallModule.empty.test`).

## 9. Leaderboard
`leaderboard/LeaderboardView`, `PlayerProfileModal`, `lib/supabase`. Tab all-time (top 100 + rank sendiri) & mingguan (`weekly_scores`, minggu ISO UTC). Cache lokal bila jaringan gagal. Skor mingguan hanya bertambah dari event `kanji_write` (event `quiz_answer` tak lagi dikirim siapa pun: pengirim satu-satunya, `QuizEngine`, sudah mati sebelum PR ini) ✅. C 🔶.

## 10. Pengaturan & akun
`settings/SettingsView` (akun, profil/avatar, audio/furigana/tema, dukungan, reset progres), `auth/AuthModal` (email+password; Google bila `VITE_GOOGLE_AUTH=true`), `lib/googleIdentity`. C 🔶. Reset data mempertahankan `userId`.

## 11. Mesin bahasa (lib internal)
J-LIE: `morphology/inflectionEngine` (konjugasi kata kerja/adjektiva; tes), `syntax/patternSchemas`+`particleRules`, `synthesis/sentenceSynthesizer`, `practice/sentenceBuilderEngine`, `registry/entityRegistry` + `traits/traits` (kontrak kapabilitas entitas), `utils/furiganaUtils`, `imeEngine`, `audio` (TTS Web Speech + efek suara).

## 12. Kode terjangkau-tapi-tak-dipakai (ekspor mati) 🔶
`generateAdaptiveRecommendation`, `generateBossBattleDiagnostic`, `diagnoseDokkaiMistake`, `calculateOverallMastery`, `getLevelInfo`, `data/templateDecks`, `data/entityAdapters`, `utils/grammarHighlight`, `utils/questionUtils`, `data/tower2/index.ts` (3 baris) — tak terjangkau dari entry point menurut analisis impor statis setelah penghapusan UI lama (758 baris).
