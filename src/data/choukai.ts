import { ChoukaiItem } from '../types/content';

export const CHOUKAI_DATABASE: Record<string, ChoukaiItem> = {
  choukai_001: {
    id: 'choukai_001',
    title: 'Choukai Stage 1: 週末の約束と駅での待ち合わせ',
    level: 'N4/N3',
    dialogueSpeaker: '男の人 (Kenji) と 女の人 (Yuki)',
    audioText: '男の人と女の人が今度の週末の予定について話しています。女の人：ねえ、今週の土曜日、新しい映画を見に行かない？男の人：いいね！何時にどこで会おうか。女の人：映画は午後２時からだから、駅の東口で１時半に待ち合わせしよう。お昼ご飯はもう食べた後がいいかな。男の人：了解。じゃあ、チケットは僕がネットで事前に予約しておくよ。女の人：ありがとう、助かるわ！',
    transcript: `女の人：ねえ、今週の土曜日、新しい映画を見に行かない？
男の人：いいね！何時にどこで会おうか。
女の人：映画は午後２時からだから、駅の東口で１時半に待ち合わせしよう。お昼ご飯はもう食べた後がいいかな。
男の人：了解。じゃあ、チケットは僕がネットで事前に予約しておくよ。
女の人：ありがとう、助かるわ！`,
    speechRate: 0.9,
    questions: [
      {
        id: 'ck_001_1',
        prompt: '二人は何曜日に会う約束をしましたか。',
        options: ['日曜日 (Hari Minggu)', '土曜日 (Hari Sabtu)', '金曜日', '月曜日'],
        correctIndex: 1,
        explanation: 'Di awal percakapan wanita mengatakan: 「今週の土曜日、新しい映画を見に行かない？」 (Hari Sabtu ini).'
      },
      {
        id: 'ck_001_2',
        prompt: '二人は何時にどこで待ち合わせをしますか。',
        options: [
          '午後２時に映画館の前',
          '午後１時に駅の西口',
          '午後１時半に駅の東口 (13:30 di Pintu Timur Stasiun)',
          '午後２時半にレストラン'
        ],
        correctIndex: 2,
        explanation: 'Wanita mengatakan: 「駅の東口で１時半に待ち合わせしよう」 (Pintu timur stasiun pukul 13:30).'
      },
      {
        id: 'ck_001_3',
        prompt: '男の人は事前に何をしておくと言いましたか。',
        options: [
          'お昼ご飯のレストランを探しておく',
          '映画のパンフレットを買っておく',
          '友達に連絡しておく',
          'ネットで映画のチケットを予約しておく (Memesan tiket film via internet)'
        ],
        correctIndex: 3,
        explanation: 'Pria mengatakan: 「チケットは僕がネットで事前に予約しておくよ」 (Saya akan memesan tiket film lewat internet sebelumnya).'
      }
    ]
  }
};
