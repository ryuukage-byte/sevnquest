// Data stage Bunpou Dungeon: Grammar Fusion. Stage baru = entri baru di sini (tanpa mengubah UI).
import type { FusionStage } from '../../engine/fusion/types';

export const FUSION_STAGES: FusionStage[] = [
  {
    id: 'fusion-n5-naide-kudasai-01',
    title: 'Larangan Sopan: 〜ないでください',
    jlpt: 'N5',
    difficulty: 1,
    words: [{ japanese: '食べる', reading: 'たべる', meaning: 'makan' }],
    target: {
      pattern: '〜ないでください',
      meaning: 'Tolong jangan ...',
      explanation:
        'Pola ないでください meminta lawan bicara untuk tidak melakukan sesuatu dengan sopan. ' +
        'Bentuknya: kata kerja bentuk ない + で + ください.',
    },
    steps: [
      { ruleId: 'dictionary_to_nai', instruction: 'Ubah kata ke bentuk nai.', resultMeaning: 'tidak makan' },
      { ruleId: 'add_de', instruction: 'Tambahkan で agar kata tersambung ke permintaan.', resultMeaning: 'jangan makan / tanpa makan' },
      { ruleId: 'add_kudasai', instruction: 'Tambahkan ください untuk membuatnya sopan.', resultMeaning: 'Tolong jangan makan' },
    ],
    // Jawaban benar + pengecoh (て形 dan ます形 valid sebagai konjugasi, tapi bukan arah pola ini).
    components: ['dictionary_to_nai', 'dictionary_to_te', 'dictionary_to_masu', 'add_de', 'add_kudasai'],
    reward: { exp: 60, gold: 30 },
  },
];

export function getFusionStage(id: string): FusionStage | undefined {
  return FUSION_STAGES.find(s => s.id === id);
}
