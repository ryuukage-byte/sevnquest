import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcEngineExp, calculateQuizReward, calculateWritingReward, calculateFlashcardReward,
  getBunpouBaseExp, getKanjiBaseExp, getKotobaBaseExp, ENGINE_EXP_MULTIPLIER,
} from './rewards';
import { RPG_TIERS, calculateLevelFromExp, getLevelInfo, calculateMaxHp, calculateMaxMp } from '../data/rpg/tiers';
import { flipExpFor } from './flashcardSession';

// Tes karakterisasi: mengunci rumus yang berlaku (EXP_ECONOMY.md §2). Ubah angka di sini = ubah ekonomi.

test('base EXP kanji: level + 2,5×goresan; kana/suuji memakai bobot sendiri', () => {
  assert.equal(getKanjiBaseExp({ character: '日', strokeCount: 4, jlpt: 'N5' }), 20 + 10);
  assert.equal(getKanjiBaseExp({ character: '議', strokeCount: 20, jlpt: 'N3' }), 45 + 50);
  assert.equal(getKanjiBaseExp({ character: 'あ', strokeCount: 3, jlpt: 'N5' }), 12 + 8, 'kana: bobot KANA 12, round(7,5)=8');
  assert.equal(getKanjiBaseExp({ character: '一', strokeCount: 1, jlpt: 'N5' }), 12 + 3, 'suuji: bobot 12, round(2,5)=3');
  assert.equal(getKanjiBaseExp({ character: '未', jlpt: undefined }), 45 + 20, 'default N3, 8 goresan');
});

test('base EXP kotoba: level + 2×panjang + 5×jumlah kanji; default N5', () => {
  assert.equal(getKotobaBaseExp({ word: 'ねこ', jlpt: 'N5' }), 15 + 4);
  assert.equal(getKotobaBaseExp({ word: '食べる', jlpt: 'N4', kanjiComponents: ['食'] }), 22 + 6 + 5);
  assert.equal(getKotobaBaseExp({ word: 'あ' }), 15 + 2);
  assert.equal(getKotobaBaseExp({ word: '𠮷野家', jlpt: 'N1', kanjiComponents: ['𠮷', '野', '家'] }), 65 + 6 + 15, 'karakter di luar BMP dihitung 1');
});

test('base EXP bunpou: level + 5×sub-formula; default N3', () => {
  assert.equal(getBunpouBaseExp({ level: 'N2', subFormulas: [1, 2, 3] }), 70 + 15);
  assert.equal(getBunpouBaseExp({ level: 'N5' }), 25);
  assert.equal(getBunpouBaseExp({}), 50);
});

test('multiplier engine terkunci', () => {
  assert.deepEqual({ ...ENGINE_EXP_MULTIPLIER }, {
    flashcard_flip: 0.005, flashcard: 1.0, quiz: 1.2, writing: 1.5, sentence: 2.0, recall: 1.0, arcade: 0.35,
  });
  assert.equal(calcEngineExp(30, 'quiz'), 36);
  assert.equal(calcEngineExp(30, 'arcade'), 11, '10,5 dibulatkan ke 11');
  assert.equal(calcEngineExp(30, 'writing', 1.25), 56);
  assert.equal(calcEngineExp(-5, 'quiz'), 0, 'tidak pernah negatif');
});

test('mikro-EXP flip: calcEngineExp membulatkan ke 0 — jalur pecahan WAJIB lewat flipExpFor + expFraction', () => {
  assert.equal(calcEngineExp(30, 'flashcard_flip'), 0);
  assert.equal(flipExpFor(30), 0.15);
});

test('reward flashcard = base × 1,0, gold 0', () => {
  assert.deepEqual(calculateFlashcardReward(37, true), { expGained: 37, goldGained: 0 });
});

test('reward kuis: akurasi 100% ×1,3; 80–99% ×1,1; 60–79% ×1,0; <60% ×0,8; minimal 10 EXP / 5 gold', () => {
  const r = (level: string, ok: number, n: number, int = 0) => calculateQuizReward(level, ok, n, int);
  assert.equal(r('N3', 10, 10).expGained, Math.round(10 * 35 * 1.2 * 1.3)); // 546
  assert.equal(r('N3', 10, 10).goldGained, 273);
  assert.equal(r('N3', 8, 10).expGained, Math.round(8 * 35 * 1.2 * 1.1)); // 370
  assert.equal(r('N3', 6, 10).expGained, Math.round(6 * 35 * 1.2)); // 252
  assert.equal(r('N5', 3, 10).expGained, Math.round(3 * 18 * 1.2 * 0.8)); // 52
  assert.equal(r('N5', 0, 10).expGained, 10, 'lantai 10 EXP walau 0 benar');
  assert.equal(r('N5', 0, 10).goldGained, 5);
  assert.equal(r('N3', 10, 10, 20).expGained, Math.round(10 * 35 * 1.2 * 1.3 * 1.1), 'INT 20 = +10%');
  assert.equal(r('XX', 1, 1).expGained, Math.max(10, Math.round(1 * 18 * 1.2 * 1.3)), 'level tak dikenal → N5');
  // bentuk objek setara bentuk posisional
  assert.deepEqual(calculateQuizReward({ level: 'N4', totalQuestions: 5, correctCount: 4, playerInt: 5 }), calculateQuizReward('N4', 4, 5, 5));
});

test('reward menulis: faktor performa dijepit 0,8–1,25; bonus & penalti terkunci', () => {
  const perfect = calculateWritingReward({ baseExp: 50, mistakesCount: 0, watermarkUsed: false, animationCount: 0, elapsedSeconds: 10, strokeCount: 6 });
  assert.equal(perfect.expGained, Math.round(50 * 1.5 * 1.25)); // 94
  assert.deepEqual(perfect.bonusReasons, ['Tanpa Panduan (+35%)', 'Tanpa Animasi (+25%)', 'Goresan Sempurna (+25%)', 'Fokus Cepat (+10%)']);
  assert.equal(perfect.goldGained, 0);

  const worst = calculateWritingReward({ baseExp: 50, mistakesCount: 5, watermarkUsed: true, animationCount: 3, elapsedSeconds: 100, strokeCount: 6 });
  assert.equal(worst.expGained, Math.round(50 * 1.5 * 0.8)); // 60 (lantai 0,8)
  assert.equal(worst.breakdown.animationPenalty, 0.16);
  assert.equal(worst.breakdown.mistakesPenalty, 0.15);

  const tooFast = calculateWritingReward({ baseExp: 50, mistakesCount: 0, watermarkUsed: false, animationCount: 0, elapsedSeconds: 1, strokeCount: 6 });
  assert.equal(tooFast.breakdown.focusTimeBonus, false, '<2 dtk = spam coretan, tanpa bonus fokus');
});

test('level, tier, dan HP/MP: titik batas', () => {
  assert.equal(calculateLevelFromExp(0), 1);
  assert.equal(calculateLevelFromExp(99), 1);
  assert.equal(calculateLevelFromExp(100), 2);
  assert.equal(calculateLevelFromExp(-50), 1);
  for (const L of [2, 5, 10, 20, 50, 100]) {
    const start = 25 * L * L + 25 * L - 50;
    assert.equal(calculateLevelFromExp(start), L, `awal level ${L}`);
    assert.equal(calculateLevelFromExp(start - 1), L - 1, `satu sebelum level ${L}`);
  }
  const info = getLevelInfo(150);
  assert.equal(info.level, 2);
  assert.equal(info.currentLevelStartExp, 100);
  assert.equal(info.nextLevelStartExp, 25 * 9 + 25 * 3 - 50, 'level 3 mulai di 250');
  assert.equal(calculateMaxHp(10, 4), 100 + 100 + 60);
  assert.equal(calculateMaxMp(10, 4), 40 + 50 + 32);
});

test('KONTRAK dengan SQL nq_tier_for_exp / nq_level_for_exp (proyek live): ambang tier identik', () => {
  // Salinan ambang dari fungsi SQL (diverifikasi 2026-10-13). Ubah keduanya sekaligus.
  const sqlThresholds = [0, 1200, 4000, 10000, 22000, 45000, 80000, 135000, 210000, 320000];
  assert.deepEqual(RPG_TIERS.map(t => t.requiredExpTotal), sqlThresholds);
  const sqlLevel = (e: number) => Math.max(1, Math.floor((-1 + Math.sqrt(9 + 0.16 * Math.max(e, 0))) / 2));
  for (const e of [0, 1, 99, 100, 1199, 1200, 22000, 319999, 320000, 2_000_000]) {
    assert.equal(calculateLevelFromExp(e), sqlLevel(e), `EXP ${e}`);
  }
});
