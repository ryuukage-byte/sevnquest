// ==============================================================================
// NIHONGO TOWER — ROUND RESOLVER (STAGE 3)
// ==============================================================================

import {
  TowerFloorBlueprint,
  RoundPhase,
  RoundInput,
  InscriptionRoundInput,
  IdentificationRoundInput,
  IdentificationQuestion,
  AlchemyRoundInput,
  AlchemyTarget,
  SentenceRoundInput,
  JLPTRoundInput,
  JLPTBossQuestion,
  GenericRoundInput,
  ConjugationTier,
  CONJUGATION_RULES,
  JLPTLevel
} from '../../../types/tower';
import { conjugateVerb } from '../../morphology/inflectionEngine';
import { ConjugationForm } from '../../types';
import { KOTOBA_DATABASE } from '../../../data/kotoba';
import { seededShuffle, createPrng } from '../floorGenerator';
import { FOUNDATION_FLOORS_DATA } from '../foundationFloorsData';

/**
 * Mapping from Indonesian/Japanese rule labels in CONJUGATION_RULES to ConjugationForm
 */
const RULE_TO_FORM_MAP: Record<string, ConjugationForm> = {
  'ます': 'masu',
  'ない': 'nai',
  'た': 'ta',
  'て': 'te',
  'たい': 'tai',
  'ながら': 'masu_stem', // followed by ながら
  'たことがある': 'ta',
  'たら': 'tara',
  '受身': 'passive',
  '使役': 'causative',
  '使役受身': 'causative_passive',
  'ば': 'ba'
};

import { generateRoundDifficulty } from './roundDifficulty';

/**
 * Resolves a floor blueprint and round phase into a strongly-typed RoundInput contract
 */
export class RoundResolver {
  /**
   * Main entry: Resolves round input for a specific roundIndex of a floor blueprint
   */
  public static resolveRound(
    blueprint: TowerFloorBlueprint,
    roundIndex: number
  ): RoundInput {
    const clampedIndex = Math.max(0, Math.min(blueprint.rounds.length - 1, roundIndex));
    const phase = blueprint.rounds[clampedIndex];
    const roundSeed = `${blueprint.seed || 'NQ'}_R${roundIndex}_${phase}`;
    const prng = createPrng(roundSeed);
    const difficultySettings = generateRoundDifficulty(blueprint.floor, phase);

    let roundInput: RoundInput;

    switch (phase) {
      case RoundPhase.INSCRIPTION:
        roundInput = this.resolveInscription(blueprint, clampedIndex, prng);
        break;

      case RoundPhase.IDENTIFICATION:
        roundInput = this.resolveIdentification(blueprint, clampedIndex, prng);
        break;

      case RoundPhase.ALCHEMY:
        roundInput = this.resolveAlchemy(blueprint, clampedIndex, prng);
        break;

      case RoundPhase.SENTENCE:
        roundInput = this.resolveSentence(blueprint, clampedIndex, prng);
        break;

      case RoundPhase.JLPT_VOCABULARY:
      case RoundPhase.JLPT_GRAMMAR:
      case RoundPhase.JLPT_READING:
      case RoundPhase.JLPT_LISTENING:
        roundInput = this.resolveJLPTBoss(blueprint, clampedIndex, phase, prng);
        break;

      default:
        roundInput = this.resolveGeneric(blueprint, clampedIndex, phase);
        break;
    }

    roundInput.difficultySettings = difficultySettings;
    return roundInput;
  }

  /**
   * 3.1.1 Inscription Resolver (Kanji Writing Canvas)
   */
  private static resolveInscription(
    blueprint: TowerFloorBlueprint,
    roundIndex: number,
    prng: () => number
  ): InscriptionRoundInput {
    const foundation = blueprint.floor <= 10 ? FOUNDATION_FLOORS_DATA[blueprint.floor] : null;
    const targetKanji = foundation
      ? foundation.inscriptionTarget
      : (blueprint.kanji.length > 0 ? blueprint.kanji[roundIndex % blueprint.kanji.length] : {
          kanji: '日',
          onyomi: ['ニチ'],
          kunyomi: ['ひ'],
          meaning: 'Matahari / Hari',
          writingRequired: true
        });

    const targets = foundation?.inscriptionTargets || [targetKanji];

    const isKana = targetKanji.meaning.includes('Hiragana') ||
      targetKanji.meaning.includes('Katakana') ||
      targetKanji.kanji.charCodeAt(0) < 0x4e00;

    const prompt = isKana
      ? `Tuliskan Aksara: ${targetKanji.kanji} (${targetKanji.meaning})`
      : `Tuliskan Kanji: ${targetKanji.kanji} (${targetKanji.meaning})`;

    return {
      roundIndex,
      phase: RoundPhase.INSCRIPTION,
      floor: blueprint.floor,
      difficulty: blueprint.difficulty,
      targetKanji,
      targets,
      prompt,
      minAccuracyScore: Math.min(85, 65 + Math.floor(blueprint.difficulty * 2))
    };
  }

  /**
   * 3.1.2 Identification Resolver (Reading & Meaning Quiz)
   */
  private static resolveIdentification(
    blueprint: TowerFloorBlueprint,
    roundIndex: number,
    prng: () => number
  ): IdentificationRoundInput {
    const foundation = blueprint.floor <= 10 ? FOUNDATION_FLOORS_DATA[blueprint.floor] : null;

    if (foundation) {
      // In 4-round Foundation floors:
      // Round index 1 = Kana character & sound recognition quiz (5-6 questions)
      // Round index 2 = Vocabulary reading & meaning quiz (5 questions)
      const isVocabRound = roundIndex >= 2;
      const questions = isVocabRound && foundation.vocabularyQuestions.length > 0
        ? foundation.vocabularyQuestions
        : foundation.identificationQuestions;
      const targets = foundation.vocabularyTargets;

      return {
        roundIndex,
        phase: RoundPhase.IDENTIFICATION,
        floor: blueprint.floor,
        difficulty: blueprint.difficulty,
        targets,
        questions
      };
    }

    const targets = blueprint.vocabulary.length > 0
      ? blueprint.vocabulary
      : [
          {
            id: 'default_v1',
            word: '食べる',
            reading: 'たべる',
            meaning: 'makan',
            source: 'new' as const,
            masteryRequired: 70
          }
        ];

    const questions: IdentificationQuestion[] = [];
    const allDbWords = Object.values(KOTOBA_DATABASE);

    targets.forEach((target, idx) => {
      const isReadingQuestion = idx % 2 === 0;

      if (isReadingQuestion) {
        // Distractor readings
        const otherReadings = targets
          .filter(t => t.id !== target.id)
          .map(t => t.reading);

        while (otherReadings.length < 3) {
          const randomItem = allDbWords[Math.floor(prng() * allDbWords.length)];
          if (randomItem && randomItem.reading !== target.reading && !otherReadings.includes(randomItem.reading)) {
            otherReadings.push(randomItem.reading);
          }
        }

        const options = seededShuffle([target.reading, ...otherReadings.slice(0, 3)], prng);

        questions.push({
          targetId: target.id,
          questionType: 'reading',
          prompt: `Apa cara baca dari: 「${target.word}」?`,
          options,
          correctAnswer: target.reading
        });
      } else {
        // Meaning question
        const otherMeanings = targets
          .filter(t => t.id !== target.id)
          .map(t => t.meaning);

        while (otherMeanings.length < 3) {
          const randomItem = allDbWords[Math.floor(prng() * allDbWords.length)];
          const meaning = randomItem?.meaningId || randomItem?.meaningEn || 'berjalan';
          if (meaning !== target.meaning && !otherMeanings.includes(meaning)) {
            otherMeanings.push(meaning);
          }
        }

        const options = seededShuffle([target.meaning, ...otherMeanings.slice(0, 3)], prng);

        questions.push({
          targetId: target.id,
          questionType: 'meaning',
          prompt: `Apa arti dari: 「${target.word}」?`,
          options,
          correctAnswer: target.meaning
        });
      }
    });

    return {
      roundIndex,
      phase: RoundPhase.IDENTIFICATION,
      floor: blueprint.floor,
      difficulty: blueprint.difficulty,
      targets,
      questions
    };
  }

  /**
   * 3.1.3 Alchemy Resolver (Conjugation Engine)
   */
  private static resolveAlchemy(
    blueprint: TowerFloorBlueprint,
    roundIndex: number,
    prng: () => number
  ): AlchemyRoundInput {
    const tier = blueprint.conjugationTier || ConjugationTier.BASIC;
    const rulePool = CONJUGATION_RULES[tier] || CONJUGATION_RULES[ConjugationTier.BASIC];

    // Find verbs from floor vocabulary or use authentic fallback verbs
    const candidateVerbs = blueprint.vocabulary.filter(v =>
      v.word.endsWith('る') ||
      v.word.endsWith('う') ||
      v.word.endsWith('く') ||
      v.word.endsWith('す') ||
      v.word.endsWith('つ') ||
      v.word.endsWith('む') ||
      v.word.endsWith('ぶ')
    );

    const baseVerbList = candidateVerbs.length > 0
      ? candidateVerbs
      : [
          { id: 'v_taberu', word: '食べる', reading: 'たべる', meaning: 'makan' },
          { id: 'v_nomu', word: '飲む', reading: 'のむ', meaning: 'minum' },
          { id: 'v_iku', word: '行く', reading: 'いく', meaning: 'pergi' }
        ];

    const targets: AlchemyTarget[] = [];
    const count = Math.min(3, baseVerbList.length);

    for (let i = 0; i < count; i++) {
      const verbItem = baseVerbList[i % baseVerbList.length];
      const ruleName = rulePool[Math.floor(prng() * rulePool.length)];
      const conjugationForm = RULE_TO_FORM_MAP[ruleName] || 'masu';

      try {
        const conjugated = conjugateVerb(verbItem.word, verbItem.reading);
        const formResult = conjugated.forms[conjugationForm] || conjugated.forms.masu;

        let expected = formResult.japanese;
        if (ruleName === 'ながら') {
          expected = `${conjugated.forms.masu_stem.japanese}ながら`;
        } else if (ruleName === 'たことがある') {
          expected = `${conjugated.forms.ta.japanese}ことがある`;
        }

        targets.push({
          targetId: verbItem.id || `v_${i}`,
          dictionaryForm: verbItem.word,
          reading: verbItem.reading,
          ruleName,
          expectedConjugated: expected,
          hiraganaPrompt: `Konjugasikan 「${verbItem.word}」 ke bentuk ${ruleName}`,
          meaning: verbItem.meaning
        });
      } catch {
        // Safe fallback if verb parsing fails
        targets.push({
          targetId: verbItem.id || `v_${i}`,
          dictionaryForm: '食べる',
          reading: 'たべる',
          ruleName: 'ます',
          expectedConjugated: '食べます',
          hiraganaPrompt: 'Konjugasikan 「食べる」 ke bentuk ます',
          meaning: 'makan'
        });
      }
    }

    return {
      roundIndex,
      phase: RoundPhase.ALCHEMY,
      floor: blueprint.floor,
      difficulty: blueprint.difficulty,
      tier,
      targets
    };
  }

  /**
   * 3.1.4 Sentence Resolver (Syntax / Bunpou Scramble)
   */
  private static resolveSentence(
    blueprint: TowerFloorBlueprint,
    roundIndex: number,
    prng: () => number
  ): SentenceRoundInput {
    const foundation = blueprint.floor <= 10 ? FOUNDATION_FLOORS_DATA[blueprint.floor] : null;

    if (foundation && foundation.wordAssemblyQuestions && foundation.wordAssemblyQuestions.length > 0) {
      const exercises = foundation.wordAssemblyQuestions.map(w => {
        let scrambled = seededShuffle([...w.tokens], prng);
        if (scrambled.join('') === w.correctOrder.join('') && scrambled.length > 1) {
          scrambled = [scrambled[1], ...scrambled.slice(2), scrambled[0]];
        }
        return {
          prompt: w.prompt,
          englishMeaning: w.englishMeaning,
          scrambledSegments: scrambled,
          correctOrder: w.correctOrder
        };
      });

      const firstEx = exercises[0];
      const grammar = blueprint.grammar[0] || {
        id: `bp_f${blueprint.floor}`,
        pattern: blueprint.floor === 10 ? '〜です (Kelulusan Dasar)' : `Susunan Aksara F.${blueprint.floor}`,
        jlpt: JLPTLevel.N5,
        example: firstEx.correctOrder.join(''),
        unlockedFloor: blueprint.floor
      };

      return {
        roundIndex,
        phase: RoundPhase.SENTENCE,
        floor: blueprint.floor,
        difficulty: blueprint.difficulty,
        grammar,
        prompt: firstEx.prompt,
        englishMeaning: firstEx.englishMeaning,
        scrambledSegments: firstEx.scrambledSegments,
        correctOrder: firstEx.correctOrder,
        exercises
      };
    }

    const grammar = blueprint.grammar[0] || {
      id: 'bp_fallback',
      pattern: '〜です',
      jlpt: JLPTLevel.N5,
      example: '私は学生です。',
      unlockedFloor: 1
    };

    // Parse sentence into segments for unscrambling
    const cleanExample = grammar.example.replace(/[。、]/g, '').trim();
    const rawSegments = cleanExample.includes(' ')
      ? cleanExample.split(' ')
      : cleanExample.length > 6
        ? [
            cleanExample.slice(0, 2),
            cleanExample.slice(2, 4),
            cleanExample.slice(4)
          ]
        : cleanExample.split('');

    const correctOrder = [...rawSegments];
    let scrambled = seededShuffle([...correctOrder], prng);

    // Ensure it is actually scrambled if length > 1
    if (scrambled.join('') === correctOrder.join('') && scrambled.length > 1) {
      scrambled = [scrambled[1], scrambled[0], ...scrambled.slice(2)];
    }

    return {
      roundIndex,
      phase: RoundPhase.SENTENCE,
      floor: blueprint.floor,
      difficulty: blueprint.difficulty,
      grammar,
      prompt: `Susun kalimat menggunakan pola: ${grammar.pattern}`,
      englishMeaning: `Contoh penerapan tata bahasa lantai ${blueprint.floor}`,
      scrambledSegments: scrambled,
      correctOrder
    };
  }

  /**
   * 3.1.5 JLPT Boss Floor Resolver
   */
  private static resolveJLPTBoss(
    blueprint: TowerFloorBlueprint,
    roundIndex: number,
    phase:
      | RoundPhase.JLPT_VOCABULARY
      | RoundPhase.JLPT_GRAMMAR
      | RoundPhase.JLPT_READING
      | RoundPhase.JLPT_LISTENING,
    prng: () => number
  ): JLPTRoundInput {
    const questions: JLPTBossQuestion[] = [];
    const level = blueprint.jlptTarget;

    if (phase === RoundPhase.JLPT_VOCABULARY) {
      questions.push({
        id: `boss_v_${roundIndex}_1`,
        prompt: `[${level} Goi] Pilih sinonim atau padanan kata yang paling tepat:`,
        options: ['毎日', '時々', 'いつも', '決して'],
        correctAnswer: 'いつも',
        explanation: 'Pertanyaan evaluasi komprehensif kosakata JLPT Boss.'
      });
    } else if (phase === RoundPhase.JLPT_GRAMMAR) {
      questions.push({
        id: `boss_g_${roundIndex}_1`,
        prompt: `[${level} Bunpou] Lengkapi kalimat: 忙しい____、パーティーに行った。`,
        options: ['のに', 'ので', 'から', 'ため'],
        correctAnswer: 'のに',
        explanation: 'Bentuk pertentangan (walaupun).'
      });
    } else if (phase === RoundPhase.JLPT_READING) {
      questions.push({
        id: `boss_r_${roundIndex}_1`,
        prompt: `[${level} Dokkai] Berdasarkan teks di atas, apa inti pesan penulis?`,
        contextText: '日本の文化では、相手への配慮がとても重要視されています。',
        options: ['Menghargai orang lain', 'Belajar bahasa', 'Makanan tradisional', 'Liburan musim panas'],
        correctAnswer: 'Menghargai orang lain',
        explanation: 'Dokkai comprehension test.'
      });
    } else {
      questions.push({
        id: `boss_l_${roundIndex}_1`,
        prompt: `[${level} Choukai] Dengarkan percakapan dan pilih jawaban yang sesuai:`,
        options: ['Pergi ke stasiun', 'Tinggal di rumah', 'Membeli tiket', 'Menunggu teman'],
        correctAnswer: 'Pergi ke stasiun',
        explanation: 'Audio listening comprehension test.'
      });
    }

    return {
      roundIndex,
      phase,
      floor: blueprint.floor,
      difficulty: blueprint.difficulty,
      jlptLevel: level,
      questions
    };
  }

  /**
   * Fallback Generic Round Resolver
   */
  private static resolveGeneric(
    blueprint: TowerFloorBlueprint,
    roundIndex: number,
    phase: RoundPhase
  ): GenericRoundInput {
    return {
      roundIndex,
      phase,
      floor: blueprint.floor,
      difficulty: blueprint.difficulty,
      title: `Tantangan Lantai ${blueprint.floor}`,
      description: `Selesaikan fase ${phase} untuk melanjutkan ke lantai berikutnya.`,
      payload: {
        theme: blueprint.theme,
        reviewRatio: blueprint.reviewRatio
      }
    };
  }
}
