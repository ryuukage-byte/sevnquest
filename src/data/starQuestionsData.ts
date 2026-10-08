/**
 * JLPT Star Questions (文の組み立て / Bun no Kumitate)
 * Authentic sentence scramble questions directly extracted from past official JLPT exams.
 */

export interface StarQuestion {
  id: string;
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  prefix: string;
  suffix: string;
  starIndex: number; // 0, 1, 2, or 3
  options: string[]; // 4 options
  correctIndex: number; // 0, 1, 2, 3
  explanation?: string;
  originalPrompt?: string;
}

export const JLPT_STAR_QUESTIONS: StarQuestion[] = [
  {
    "id": "n1_2020_12_bd_soal-36",
    "level": "N1",
    "prefix": "この花火大会は、日本の夏を語る",
    "suffix": "有名だ。",
    "starIndex": 1,
    "options": [
      "うえで",
      "として",
      "欠かせない",
      "イベント"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "この花火大会は、日本の夏を語る＿＿＿＿ ★ ＿＿＿有名だ。"
  },
  {
    "id": "n1_2020_12_bd_soal-37",
    "level": "N1",
    "prefix": "子供にいろいろなことを習わせたいという親の気持ちはよくわかるが、子供の遊ぶ時間を奪って",
    "suffix": "ないと思う。",
    "starIndex": 1,
    "options": [
      "必要は",
      "やらせる",
      "まで",
      "無理に"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "子供にいろいろなことを習わせたいという親の気持ちはよくわかるが、子供の遊ぶ時間を奪って＿＿＿＿ ★ ＿＿＿ないと思う。"
  },
  {
    "id": "n1_2020_12_bd_soal-38",
    "level": "N1",
    "prefix": "A「おとといは大雨、昨日は車のパンク。旅行に来てからトラブル続きで嫌になるよね。」\nB「本当だよ。最終日の",
    "suffix": "。」",
    "starIndex": 1,
    "options": [
      "何も",
      "今日こそ",
      "ように",
      "起きません"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "A「おとといは大雨、昨日は車のパンク。旅行に来てからトラブル続きで嫌になるよね。」\nB「本当だよ。最終日の＿＿＿＿ ★ ＿＿＿。」"
  },
  {
    "id": "n1_2020_12_bd_soal-39",
    "level": "N1",
    "prefix": "2025年には介護を必要とする高齢者が著しく増加することから、多くの専門家が「介護施設職員の給与を引き上げる",
    "suffix": "」と指摘する。",
    "starIndex": 1,
    "options": [
      "などして",
      "緊急の課題",
      "人材を確保することが",
      "介護に携わる"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "2025年には介護を必要とする高齢者が著しく増加することから、多くの専門家が「介護施設職員の給与を引き上げる＿＿＿＿ ★ ＿＿＿」と指摘する。"
  },
  {
    "id": "n1_2020_12_bd_soal-40",
    "level": "N1",
    "prefix": "川北市出身の画家平（たいら）一（かず）明（あき）の",
    "suffix": "先週20日に完成した。",
    "starIndex": 1,
    "options": [
      "建設を進めていた",
      "川北市が",
      "記念美術館が",
      "業績を後世に伝えようと"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "川北市出身の画家平（たいら）一（かず）明（あき）の＿＿＿＿ ★ ＿＿＿先週20日に完成した。"
  },
  {
    "id": "n1_2021_07_bd_soal-36",
    "level": "N1",
    "prefix": "そんな簡単なこと、わざわざあなたに",
    "suffix": "。",
    "starIndex": 1,
    "options": [
      "もらう",
      "ない",
      "説明して",
      "までも"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "そんな簡単なこと、わざわざあなたに＿＿＿＿＿★＿＿＿＿。"
  },
  {
    "id": "n1_2021_07_bd_soal-37",
    "level": "N1",
    "prefix": "ちょっと考えれば、さっきの話が冗談",
    "suffix": "単純な彼は簡単に信じてしまった。",
    "starIndex": 1,
    "options": [
      "わかるだろう",
      "だって",
      "に",
      "ことくらい"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "ちょっと考えれば、さっきの話が冗談＿＿＿＿＿★＿＿＿＿単純な彼は簡単に信じてしまった。"
  },
  {
    "id": "n1_2021_07_bd_soal-38",
    "level": "N1",
    "prefix": "彼はとても優秀で成績が学年の上位に入っている",
    "suffix": "真面目で好感が持てる。",
    "starIndex": 1,
    "options": [
      "授業に取り組む",
      "のみならず",
      "姿勢そのものも",
      "ことが多い"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "彼はとても優秀で成績が学年の上位に入っている＿＿＿＿＿★＿＿＿＿真面目で好感が持てる。"
  },
  {
    "id": "n1_2021_07_bd_soal-39",
    "level": "N1",
    "prefix": "全国高校バスケットボール大会で、惜しくも",
    "suffix": "しばらくの間、ぼう然としていた。",
    "starIndex": 1,
    "options": [
      "優勝を逃した",
      "控え室に戻っても",
      "選手たちは",
      "あと一歩というところで"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "全国高校バスケットボール大会で、惜しくも＿＿＿＿＿★＿＿＿＿しばらくの間、ぼう然としていた。"
  },
  {
    "id": "n1_2021_07_bd_soal-40",
    "level": "N1",
    "prefix": "私が接客するにあたって",
    "suffix": "自分は何をすべきかということだ。",
    "starIndex": 1,
    "options": [
      "常に考えているのは",
      "何であって",
      "それに応えるために",
      "お客様が求めていることは"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "私が接客するにあたって＿＿＿＿＿★＿＿＿＿自分は何をすべきかということだ。"
  },
  {
    "id": "n1_2022_07_bd_soal-36",
    "level": "N1",
    "prefix": "（インタビューで）\n「私が30年間歌手を続けてこられたのは、ファンの方の支えがあったからです。",
    "suffix": "歌い続けたいと思っています。」",
    "starIndex": 2,
    "options": [
      "限り",
      "ファンの皆さんが",
      "応援してくれる",
      "いる"
    ],
    "correctIndex": 2,
    "explanation": "正しい順序：2→3→1→4（ファンの皆さんが→応援してくれる→限り→いる）",
    "originalPrompt": "（インタビューで）\n「私が30年間歌手を続けてこられたのは、ファンの方の支えがあったからです。＿＿＿、＿＿＿、★　、＿＿＿歌い続けたいと思っています。」"
  },
  {
    "id": "n1_2022_07_bd_soal-37",
    "level": "N1",
    "prefix": "S市が18歳以上の",
    "suffix": "運動不足を感じていることがわかった。",
    "starIndex": 2,
    "options": [
      "意識調査を行ったところ",
      "市民を対象に",
      "多くの人が",
      "運動に関する"
    ],
    "correctIndex": 3,
    "explanation": "正しい順序：2→4→1→3（市民を対象に→運動に関する→意識調査を行ったところ→多くの人が）",
    "originalPrompt": "S市が18歳以上の＿＿＿、＿＿＿、★　、＿＿＿運動不足を感じていることがわかった。"
  },
  {
    "id": "n1_2022_07_bd_soal-38",
    "level": "N1",
    "prefix": "子供のころ、母はしつけに厳しくて、私はそれが嫌だった。しかし、母が",
    "suffix": "今ならわかる。",
    "starIndex": 2,
    "options": [
      "親になった",
      "私のことを",
      "思えばこそだったのだと",
      "厳しかったのは"
    ],
    "correctIndex": 2,
    "explanation": "正しい順序：4→2→3→1（厳しかったのは→私のことを→思えばこそだったのだと→親になった）",
    "originalPrompt": "子供のころ、母はしつけに厳しくて、私はそれが嫌だった。しかし、母が＿＿＿、＿＿＿、★　、＿＿＿今ならわかる。"
  },
  {
    "id": "n1_2022_07_bd_soal-39",
    "level": "N1",
    "prefix": "去年",
    "suffix": "、若者の間で流行している。",
    "starIndex": 2,
    "options": [
      "レインコートは",
      "機能性もさることながら",
      "M社から発売された",
      "そのかわいらしいデザインが話題となり"
    ],
    "correctIndex": 0,
    "explanation": "正しい順序：3→1→2→4（M社から発売された→レインコートは→機能性もさることながら→そのかわいらしいデザインが話題となり）",
    "originalPrompt": "去年＿＿＿、＿＿＿、★　、＿＿＿、若者の間で流行している。"
  },
  {
    "id": "n1_2022_07_bd_soal-40",
    "level": "N1",
    "prefix": "「未来のものづくりコンテスト」は、",
    "suffix": "今年で20回目を迎える。",
    "starIndex": 2,
    "options": [
      "子供たちに",
      "コンテストで",
      "ものづくりの面白さを感じてもらおうと",
      "ABC社が創立50周年を機に始めた"
    ],
    "correctIndex": 3,
    "explanation": "正しい順序：4→1→3→2（ABC社が創立50周年を機に始めた→子供たちに→ものづくりの面白さを感じてもらおうと→コンテストで）",
    "originalPrompt": "「未来のものづくりコンテスト」は、＿＿＿、＿＿＿、★　、＿＿＿今年で20回目を迎える。"
  },
  {
    "id": "n1_2023_07_bd_soal-36",
    "level": "N1",
    "prefix": "スピーチやプレゼンテーションにおいて、ジェスチャーを使いながら話すのは",
    "suffix": "印象を悪くすることもある。",
    "starIndex": 2,
    "options": [
      "あまりに",
      "効果的である反面",
      "かえって",
      "大きすぎるジェスチャーは"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "スピーチやプレゼンテーションにおいて、ジェスチャーを使いながら話すのは＿＿＿＿ ＿＿★＿＿ ＿＿＿＿印象を悪くすることもある。"
  },
  {
    "id": "n1_2023_07_bd_soal-37",
    "level": "N1",
    "prefix": "今や、書類や衣料品だけでなく生鮮食品も、インターネットへの",
    "suffix": "時代である。",
    "starIndex": 2,
    "options": [
      "自宅にいながらにして",
      "手軽に購入できる",
      "環境があれば",
      "アクセスが可能な"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "今や、書類や衣料品だけでなく生鮮食品も、インターネットへの＿＿＿＿ ＿＿★＿＿ ＿＿＿＿時代である。"
  },
  {
    "id": "n1_2023_07_bd_soal-38",
    "level": "N1",
    "prefix": "よく似た昆虫の判別は大変難しいという。中には、かなり",
    "suffix": "場合もあるそうだ。",
    "starIndex": 2,
    "options": [
      "判別が難しい",
      "昆虫学者でさえも",
      "経験を積んだ",
      "違うほど"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "よく似た昆虫の判別は大変難しいという。中には、かなり＿＿＿＿ ＿＿★＿＿ ＿＿＿＿場合もあるそうだ。"
  },
  {
    "id": "n1_2023_07_bd_soal-39",
    "level": "N1",
    "prefix": "今回の",
    "suffix": "気持ちの方が大きかった。",
    "starIndex": 2,
    "options": [
      "転職にあたり",
      "うそになるが",
      "少しも不安がなかったといえば",
      "新たなことに挑戦できてうれしいという"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "今回の＿＿＿＿ ＿＿★＿＿ ＿＿＿＿気持ちの方が大きかった。"
  },
  {
    "id": "n1_2023_07_bd_soal-40",
    "level": "N1",
    "prefix": "北山市は",
    "suffix": "のどかなところだった。",
    "starIndex": 2,
    "options": [
      "人口10万人を超える都市となったが",
      "北山駅周辺以外にはほとんど何もない",
      "今でこそ",
      "30年前までは"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "北山市は＿＿＿＿ ＿＿★＿＿ ＿＿＿＿のどかなところだった。"
  },
  {
    "id": "n1_2023_12_bd_soal-36",
    "level": "N1",
    "prefix": "当社が先月発売したパソコンについて、印刷の",
    "suffix": "ことが判明しました。",
    "starIndex": 2,
    "options": [
      "マニュアルに誤りがある",
      "設定ができないとの",
      "問い合わせが複数寄せられ",
      "調査したところ"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "当社が先月発売したパソコンについて、印刷の ___ ___ ★ ___ ことが判明しました。"
  },
  {
    "id": "n1_2023_12_bd_soal-37",
    "level": "N1",
    "prefix": "このフライパンは、さすが",
    "suffix": "とても使いやすい。",
    "starIndex": 2,
    "options": [
      "森（もり）さんが",
      "だけあって",
      "勧める",
      "料理が上手な"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "このフライパンは、さすが ___ ___ ★ ___ とても使いやすい。"
  },
  {
    "id": "n1_2023_12_bd_soal-38",
    "level": "N1",
    "prefix": "最後に見た映画が",
    "suffix": "映画を見ていない。",
    "starIndex": 2,
    "options": [
      "ほど",
      "何だったのかも",
      "思い出せない",
      "久しく"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "最後に見た映画が ___ ___ ★ ___ 映画を見ていない。"
  },
  {
    "id": "n1_2023_12_bd_soal-39",
    "level": "N1",
    "prefix": "学生から提出された論文の中に面白いものがあった。私が",
    "suffix": "これまでにない。",
    "starIndex": 2,
    "options": [
      "知る限りでは",
      "論文は",
      "分析している",
      "このアプローチで"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "学生から提出された論文の中に面白いものがあった。私が ___ ___ ★ ___ これまでにない。"
  },
  {
    "id": "n1_2023_12_bd_soal-40",
    "level": "N1",
    "prefix": "このレシピ本は、ふだん料理をしない人でも",
    "suffix": "評判になっているそうだ。",
    "starIndex": 2,
    "options": [
      "若い人の間で",
      "調理するだけで",
      "レシピに沿って",
      "簡単に本格的な料理が作れると"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "このレシピ本は、ふだん料理をしない人でも ___ ___ ★ ___ 評判になっているそうだ。"
  },
  {
    "id": "n1_2024_07_bd_soal-36",
    "level": "N1",
    "prefix": "（問題6 次の文の",
    "suffix": "に入る最もよいものを、１・2・3・4から一つ選びなさい。）",
    "starIndex": 0,
    "options": [
      "そうなるのも",
      "緊張するんだから",
      "勢いの前で何かをするのは",
      "子供が"
    ],
    "correctIndex": 1,
    "explanation": "Susunan lengkap: 大人だって <b>子供が</b> <b>勢いの前で何かをするのは</b> <b>_★_ そうなるのも</b> <b>緊張するんだから</b> 無理はないだろう.<br>Namun urutan yang tepat secara logis: 大人だって緊張するんだから、子供が勢いの前で何かをするのはそうなるのも無理はないだろう (Orang dewasa saja gugup, jadi wajar kalau anak-anak juga jadi begitu saat harus melakukan sesuatu di depan banyak orang).<br><br>Posisi ★ (posisi ke-3 dari 4 blok) jatuh pada kata <b>勢いの前で何かをするのは</b>, sehingga susunannya: 子供が → 勢いの前で何かをするのは → ★そうなるのも → 緊張するんだから.<br><br>Jawaban yang tepat adalah opsi <b>3</b> (勢いの前で何かをするのは).",
    "originalPrompt": "（問題6 次の文の ★ に入る最もよいものを、１・2・3・4から一つ選びなさい。）"
  },
  {
    "id": "n1_2024_07_bd_soal-37",
    "level": "N1",
    "prefix": "（問題6 次の文の",
    "suffix": "に入る最もよいものを、１・2・3・4から一つ選びなさい。）",
    "starIndex": 0,
    "options": [
      "雌に限っての",
      "とか",
      "行動なのだ",
      "産卵を控えた"
    ],
    "correctIndex": 2,
    "explanation": "Konteks: 「実は血を吸うのは雌だけだそうです。しかも、___ ___ _★_ ___ 専門家に詳しく聞いてみよう。」<br><br>Susunan logis: しかも、産卵を控えた雌に限っての行動なのだとか、専門家に詳しく聞いてみよう (Terlebih lagi, itu konon perilaku yang khusus terjadi pada nyamuk betina yang akan bertelur — mari tanyakan lebih lanjut ke ahlinya).<br><br>Urutan blok: 産卵を控えた → 雌に限っての → 行動なのだ → とか (baru kemudian 専門家に...).<br>Posisi ★ (blok ke-3) jatuh pada <b>行動なのだ</b>.<br><br>Jawaban yang tepat adalah opsi <b>3</b> (行動なのだ).",
    "originalPrompt": "（問題6 次の文の ★ に入る最もよいものを、１・2・3・4から一つ選びなさい。）"
  },
  {
    "id": "n1_2024_07_bd_soal-38",
    "level": "N1",
    "prefix": "（問題6 次の文の",
    "suffix": "に入る最もよいものを、１・2・3・4から一つ選びなさい。）",
    "starIndex": 0,
    "options": [
      "うえに",
      "評判も良くなった",
      "ことを踏まえ",
      "受講者からの"
    ],
    "correctIndex": 1,
    "explanation": "Konteks: 「まとめるのに時間がかかる___ ___ _★_ ___ を踏まえ、今年度は選択式で行うことにした。」<br><br>Susunan logis: まとめるのに時間がかかるうえに、受講者からの評判も良くなかったことを踏まえ (Selain memakan waktu untuk merangkum, mempertimbangkan bahwa penilaian dari peserta juga kurang baik...).<br>Urutan blok: うえに → 受講者からの → 評判も良くなった → ことを踏まえ.<br>Posisi ★ (blok ke-3) jatuh pada <b>評判も良くなった</b>.<br><br>Jawaban yang tepat adalah opsi <b>2</b> (評判も良くなった).",
    "originalPrompt": "（問題6 次の文の ★ に入る最もよいものを、１・2・3・4から一つ選びなさい。）"
  },
  {
    "id": "n1_2024_07_bd_soal-39",
    "level": "N1",
    "prefix": "（問題6 次の文の",
    "suffix": "に入る最もよいものを、１・2・3・4から一つ選びなさい。）",
    "starIndex": 0,
    "options": [
      "睡眠の質があるなんて",
      "枕に換えるだけで",
      "思っていなかったから",
      "こんなにも"
    ],
    "correctIndex": 0,
    "explanation": "Konteks: 「枕を変えたら、今までより良く眠れるようになった。自分に合った ___ ___ _★_ ___ 驚いた。」<br><br>Susunan logis: 自分に合った枕に換えるだけでこんなにも睡眠の質があるなんて思っていなかったから驚いた (Saya kaget karena tidak menyangka hanya dengan mengganti bantal yang cocok, kualitas tidur bisa sebegini baiknya).<br>Urutan blok: 枕に換えるだけで → こんなにも → 睡眠の質があるなんて → 思っていなかったから.<br>Posisi ★ (blok ke-3) jatuh pada <b>睡眠の質があるなんて</b>.<br><br>Jawaban yang tepat adalah opsi <b>1</b> (睡眠の質があるなんて).",
    "originalPrompt": "（問題6 次の文の ★ に入る最もよいものを、１・2・3・4から一つ選びなさい。）"
  },
  {
    "id": "n1_2024_07_bd_soal-40",
    "level": "N1",
    "prefix": "（問題6 次の文の",
    "suffix": "に入る最もよいものを、１・2・3・4から一つ選びなさい。）",
    "starIndex": 0,
    "options": [
      "メリットは理解しつつも",
      "導入に至っていない",
      "先端技術を取り入れる",
      "扱える人材の確保やコスト面での難しさから"
    ],
    "correctIndex": 3,
    "explanation": "Konteks: 「人工知能をはじめとする ___ ___ _★_ ___ 企業が多い。」<br><br>Susunan logis: 人工知能をはじめとする先端技術を取り入れるメリットは理解しつつも扱える人材の確保やコスト面での難しさから導入に至っていない企業が多い (Banyak perusahaan yang, meski memahami manfaat mengadopsi teknologi mutakhir seperti kecerdasan buatan, belum berhasil mengimplementasikannya karena kesulitan mendapatkan SDM yang mampu mengoperasikannya dan masalah biaya).<br>Urutan blok: 先端技術を取り入れる → メリットは理解しつつも → 扱える人材の確保やコスト面での難しさから → 導入に至っていない.<br>Posisi ★ (blok ke-3) jatuh pada <b>扱える人材の確保やコスト面での難しさから</b>.<br><br>Jawaban yang tepat adalah opsi <b>4</b> (扱える人材の確保やコスト面での難しさから).",
    "originalPrompt": "（問題6 次の文の ★ に入る最もよいものを、１・2・3・4から一つ選びなさい。）"
  },
  {
    "id": "n1_2024_12_bd_soal-36",
    "level": "N1",
    "prefix": "昨日はとても寒く、積もり",
    "suffix": "ずっと雪が降っていた。",
    "starIndex": 1,
    "options": [
      "が",
      "こそ",
      "しなかった",
      "午前中"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "昨日はとても寒く、積もり　＿＿＿　★　＿＿＿　＿＿＿　ずっと雪が降っていた。"
  },
  {
    "id": "n1_2024_12_bd_soal-37",
    "level": "N1",
    "prefix": "この映画はあまりにも正直で",
    "suffix": "、コメディー作品だ。",
    "starIndex": 1,
    "options": [
      "真面目すぎる",
      "周りの人々とのトラブルが絶えない",
      "がゆえに",
      "男の日常を描いた"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "この映画はあまりにも正直で　＿＿＿　★　＿＿＿　＿＿＿　、コメディー作品だ。"
  },
  {
    "id": "n1_2024_12_bd_soal-38",
    "level": "N1",
    "prefix": "",
    "suffix": "読みやすいように、最近は、ビジネス理論を漫画でわかりやすく解説したものが多い。",
    "starIndex": 2,
    "options": [
      "堅苦しいものと思われがちだが",
      "抵抗がある人にも",
      "一般的にビジネス書というと",
      "ビジネス書に"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "＿＿＿　＿＿＿　★　＿＿＿　読みやすいように、最近は、ビジネス理論を漫画でわかりやすく解説したものが多い。"
  },
  {
    "id": "n1_2024_12_bd_soal-39",
    "level": "N1",
    "prefix": "渋滞の中を",
    "suffix": "遊園地に入る前から疲れてしまった。",
    "starIndex": 2,
    "options": [
      "今度は",
      "3時間運転して",
      "駐車場が混雑していて",
      "ようやくついたと思ったら"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "渋滞の中を　＿＿＿　＿＿＿　★　＿＿＿　遊園地に入る前から疲れてしまった。"
  },
  {
    "id": "n1_2024_12_bd_soal-40",
    "level": "N1",
    "prefix": "商品やサービスが",
    "suffix": "ない。",
    "starIndex": 2,
    "options": [
      "売れるも売れないも",
      "その存在が",
      "知られないことには",
      "どんなに良い物でも"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "商品やサービスが　＿＿＿　＿＿＿　★　＿＿＿　ない。"
  },
  {
    "id": "n2_2021_07_bd_soal-43",
    "level": "N2",
    "prefix": "もうすぐ高校卒業だ。この学校で先生や友達と過ごす",
    "suffix": "。",
    "starIndex": 2,
    "options": [
      "あと数週間だ",
      "と思うと",
      "のも",
      "寂しさが増している"
    ],
    "correctIndex": 0,
    "explanation": "Urutan: 3のも → 1あと数週間だ(★) → 2と思うと → 4寂しさが増している",
    "originalPrompt": "もうすぐ高校卒業だ。この学校で先生や友達と過ごす ＿＿ ＿★＿ ＿＿ ＿＿ 。"
  },
  {
    "id": "n2_2021_07_bd_soal-44",
    "level": "N2",
    "prefix": "A：サラリーマンから農家",
    "suffix": "があるんだね。\nB：自分の夢をどうしてもあきらめきれなくてね。",
    "starIndex": 3,
    "options": [
      "勇気",
      "とは",
      "ずいぶん",
      "になる"
    ],
    "correctIndex": 2,
    "explanation": "Urutan: 4になる → 2とは → 3ずいぶん(★) → 1勇気",
    "originalPrompt": "A：サラリーマンから農家 ＿＿ ＿＿ ＿★＿ ＿＿ があるんだね。\nB：自分の夢をどうしてもあきらめきれなくてね。"
  },
  {
    "id": "n2_2021_07_bd_soal-45",
    "level": "N2",
    "prefix": "遠足の日の朝、娘は、「いってきます」と",
    "suffix": "飛び出していった。",
    "starIndex": 3,
    "options": [
      "終わらないか",
      "言い終わるか",
      "玄関を",
      "のうちに"
    ],
    "correctIndex": 3,
    "explanation": "Urutan: 2言い終わるか → 1終わらないか → 4のうちに(★) → 3玄関を",
    "originalPrompt": "遠足の日の朝、娘は、「いってきます」と ＿＿ ＿＿ ＿★＿ ＿＿ 飛び出していった。"
  },
  {
    "id": "n2_2021_07_bd_soal-47",
    "level": "N2",
    "prefix": "この池に",
    "suffix": "そうだ。",
    "starIndex": 3,
    "options": [
      "ものもいる",
      "魚の中には",
      "すむ",
      "100年以上生きる"
    ],
    "correctIndex": 3,
    "explanation": "Urutan: 3すむ → 2魚の中には → 4 100年以上生きる(★) → 1ものもいる",
    "originalPrompt": "この池に ＿＿ ＿＿ ＿★＿ ＿＿ そうだ。"
  },
  {
    "id": "n2_2021_12_bd_soal-43",
    "level": "N2",
    "prefix": "もう酒は飲まないと",
    "suffix": "絶対に守りたい。",
    "starIndex": 2,
    "options": [
      "決めた",
      "どんなに",
      "以上は",
      "誘われても"
    ],
    "correctIndex": 2,
    "explanation": "Urutan: 1決めた → 3以上は(★) → 2どんなに → 4誘われても",
    "originalPrompt": "もう酒は飲まないと ＿＿ ＿★＿ ＿＿ ＿＿ 絶対に守りたい。"
  },
  {
    "id": "n2_2021_12_bd_soal-44",
    "level": "N2",
    "prefix": "必要のない物でも、欲しくなると",
    "suffix": "しまう。",
    "starIndex": 3,
    "options": [
      "買わずには",
      "すぐ買って",
      "いられなく",
      "なって"
    ],
    "correctIndex": 3,
    "explanation": "Urutan: 1買わずには → 3いられなく → 4なって(★) → 2すぐ買って",
    "originalPrompt": "必要のない物でも、欲しくなると ＿＿ ＿＿ ＿★＿ ＿＿ しまう。"
  },
  {
    "id": "n2_2021_12_bd_soal-45",
    "level": "N2",
    "prefix": "パソコンの電源を入れたのだが、画面に「お待ちください」という",
    "suffix": "、電源を入れ直した。",
    "starIndex": 3,
    "options": [
      "待っても",
      "何分",
      "メッセージが出たまま",
      "先に進まないので"
    ],
    "correctIndex": 0,
    "explanation": "Urutan: 3メッセージが出たまま → 2何分 → 1待っても(★) → 4先に進まないので",
    "originalPrompt": "パソコンの電源を入れたのだが、画面に「お待ちください」という ＿＿ ＿＿ ＿★＿ ＿＿ 、電源を入れ直した。"
  },
  {
    "id": "n2_2021_12_bd_soal-46",
    "level": "N2",
    "prefix": "（電話で）\nA「すみません、来週の２時からの会議ですが、その時間、別の用件が入ってしまいまして……。もしそちらのご都合が",
    "suffix": "、いかがでしょうか。」\nB「こちらは大丈夫ですよ。」",
    "starIndex": 3,
    "options": [
      "ありがたいんですが",
      "変更していただけると",
      "４時以降に",
      "よろしければ"
    ],
    "correctIndex": 1,
    "explanation": "Urutan: 4よろしければ → 3四時以降に → 2変更していただけると(★) → 1ありがたいんですが",
    "originalPrompt": "（電話で）\nA「すみません、来週の２時からの会議ですが、その時間、別の用件が入ってしまいまして……。もしそちらのご都合が ＿＿ ＿＿ ＿★＿ ＿＿ 、いかがでしょうか。」\nB「こちらは大丈夫ですよ。」"
  },
  {
    "id": "n2_2021_12_bd_soal-47",
    "level": "N2",
    "prefix": "20年前に初めてこの歌手の歌を聴いたとき、",
    "suffix": "。",
    "starIndex": 3,
    "options": [
      "と思った",
      "よく覚えている",
      "のを",
      "なんて美しい声なんだろう"
    ],
    "correctIndex": 1,
    "explanation": "Urutan: 4なんて美しい声なんだろう → 1と思った → 3のを → 2よく覚えている(★)",
    "originalPrompt": "20年前に初めてこの歌手の歌を聴いたとき、 ＿＿ ＿＿ ＿★＿ ＿＿ 。"
  },
  {
    "id": "n2_2022_07_bd_soal-43",
    "level": "N2",
    "prefix": "この歌を聞く",
    "suffix": "ことだ。彼はカラオケに行くと必ずこの歌を歌っていた。",
    "starIndex": 2,
    "options": [
      "のは",
      "思い出す",
      "たびに",
      "高校時代の友人の"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "この歌を聞く　＿＿　＿★＿　＿＿　ことだ。彼はカラオケに行くと必ずこの歌を歌っていた。"
  },
  {
    "id": "n2_2022_07_bd_soal-44",
    "level": "N2",
    "prefix": "昨日、アルバイトに遅刻しそうだったので",
    "suffix": "結局遅刻してしまった。",
    "starIndex": 2,
    "options": [
      "タクシーに乗ったら",
      "かえって時間がかかり",
      "急ごうと思って",
      "道が渋滞していたせいで"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "昨日、アルバイトに遅刻しそうだったので　＿＿　＿★＿　＿＿　結局遅刻してしまった。"
  },
  {
    "id": "n2_2022_07_bd_soal-45",
    "level": "N2",
    "prefix": "来月結婚する友人に結婚式のスピーチを頼まれた。大勢の前で話すのは",
    "suffix": "引き受けることにした。",
    "starIndex": 2,
    "options": [
      "悩んだのだが",
      "と言われて",
      "どうしても",
      "苦手なので"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "来月結婚する友人に結婚式のスピーチを頼まれた。大勢の前で話すのは　＿＿　＿★＿　＿＿　引き受けることにした。"
  },
  {
    "id": "n2_2022_07_bd_soal-46",
    "level": "N2",
    "prefix": "先日の政治家A氏の発言はあまりに無責任だ。",
    "suffix": "、と思う。",
    "starIndex": 2,
    "options": [
      "政治家としての",
      "うえで",
      "発言しなければならなかった",
      "自分の立場をよく考えた"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "先日の政治家A氏の発言はあまりに無責任だ。　＿＿　＿★＿　＿＿　、と思う。"
  },
  {
    "id": "n2_2022_07_bd_soal-47",
    "level": "N2",
    "prefix": "食事や睡眠などの生活習慣は一度乱れてしまうと",
    "suffix": "大切だ。",
    "starIndex": 2,
    "options": [
      "規則正しい生活を",
      "戻そうとしても",
      "普段から意識することが",
      "なかなか戻せないので"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "食事や睡眠などの生活習慣は一度乱れてしまうと　＿＿　＿★＿　＿＿　大切だ。"
  },
  {
    "id": "n2_2022_12_bd_soal-43",
    "level": "N2",
    "prefix": "私はとにかく勉強が嫌いで、学校があまり好きではない子供だった。そんな",
    "suffix": "きっかけだった。",
    "starIndex": 2,
    "options": [
      "ある先生との",
      "教師になりたいと思ったのは",
      "私が",
      "出会いが"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "私はとにかく勉強が嫌いで、学校があまり好きではない子供だった。そんな　＿＿　＿★＿　＿＿　きっかけだった。"
  },
  {
    "id": "n2_2022_12_bd_soal-44",
    "level": "N2",
    "prefix": "若いときに努力して",
    "suffix": "なって必ず将来役に立つと思う。",
    "starIndex": 2,
    "options": [
      "経験は",
      "目標を",
      "自信と",
      "達成した"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "若いときに努力して　＿＿　＿★＿　＿＿　なって必ず将来役に立つと思う。"
  },
  {
    "id": "n2_2022_12_bd_soal-45",
    "level": "N2",
    "prefix": "この町では、都心で家を借りる",
    "suffix": "家が借りられる。",
    "starIndex": 2,
    "options": [
      "場合",
      "半分程度の",
      "家賃で",
      "と比べて"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "この町では、都心で家を借りる　＿＿　＿★＿　＿＿　家が借りられる。"
  },
  {
    "id": "n2_2022_12_bd_soal-46",
    "level": "N2",
    "prefix": "",
    "suffix": "酸素や栄養が十分に細胞に届かなくなってしまう。",
    "starIndex": 2,
    "options": [
      "運ばれる",
      "悪くなると",
      "血液の流れが",
      "血液によって"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "＿＿　＿★＿　＿＿　酸素や栄養が十分に細胞に届かなくなってしまう。"
  },
  {
    "id": "n2_2022_12_bd_soal-47",
    "level": "N2",
    "prefix": "さくら駅周辺の再開発事業を行う",
    "suffix": "予定だ。",
    "starIndex": 2,
    "options": [
      "さくら市は",
      "に先立って",
      "関係者に対する",
      "説明会を開催する"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "さくら駅周辺の再開発事業を行う　＿＿　＿★＿　＿＿　予定だ。"
  },
  {
    "id": "n2_2023_07_bd_soal-43",
    "level": "N2",
    "prefix": "隣のクラスの友達とけんかをしてしまい、学校の廊下で",
    "suffix": "なくなってしまった。",
    "starIndex": 2,
    "options": [
      "こと",
      "すら",
      "目を合わせる",
      "すれ違っても"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "隣のクラスの友達とけんかをしてしまい、学校の廊下で　＿＿　＿★＿　＿＿　なくなってしまった。"
  },
  {
    "id": "n2_2023_07_bd_soal-44",
    "level": "N2",
    "prefix": "このソファーは、それなりの大きさはあるが、",
    "suffix": "楽に動かせる。",
    "starIndex": 2,
    "options": [
      "ほどの",
      "でも",
      "重さはないため",
      "一人"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "このソファーは、それなりの大きさはあるが、　＿＿　＿★＿　＿＿　楽に動かせる。"
  },
  {
    "id": "n2_2023_07_bd_soal-45",
    "level": "N2",
    "prefix": "友達にスキー旅行に誘われている。返事を",
    "suffix": "まだ返事ができていない。",
    "starIndex": 2,
    "options": [
      "決まっていなくて",
      "仕事の予定が",
      "しなければ",
      "と思いながらも"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "友達にスキー旅行に誘われている。返事を　＿＿　＿★＿　＿＿　まだ返事ができていない。"
  },
  {
    "id": "n2_2023_07_bd_soal-46",
    "level": "N2",
    "prefix": "私は、美術館では音声ガイドの機械を借りて、説明を聞きながら作品を鑑賞する。作品のどこに",
    "suffix": "その作品をより深く味わえるからだ。",
    "starIndex": 2,
    "options": [
      "わかると",
      "注目して",
      "いいのかが",
      "鑑賞したら"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "私は、美術館では音声ガイドの機械を借りて、説明を聞きながら作品を鑑賞する。作品のどこに　＿＿　＿★＿　＿＿　その作品をより深く味わえるからだ。"
  },
  {
    "id": "n2_2023_07_bd_soal-47",
    "level": "N2",
    "prefix": "雪が降っている",
    "suffix": "、風がほとんどないからだろう。",
    "starIndex": 2,
    "options": [
      "わりに",
      "のは",
      "寒く感じない",
      "そんなに"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "雪が降っている　＿＿　＿★＿　＿＿　、風がほとんどないからだろう。"
  },
  {
    "id": "n2_2023_12_bd_soal-43",
    "level": "N2",
    "prefix": "この本の内容をきちんと",
    "suffix": "多いだろう。",
    "starIndex": 2,
    "options": [
      "それなりの",
      "理解するには",
      "難しいと感じる人も",
      "知識が求められるので"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "この本の内容をきちんと ___ _★_ ___ ___ 多いだろう。"
  },
  {
    "id": "n2_2023_12_bd_soal-44",
    "level": "N2",
    "prefix": "石油は、自動車や航空機などの",
    "suffix": "原料としても利用されている。",
    "starIndex": 2,
    "options": [
      "使われる",
      "だけでなく",
      "プラスチック製品を作る",
      "燃料として"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "石油は、自動車や航空機などの ___ _★_ ___ ___ 原料としても利用されている。"
  },
  {
    "id": "n2_2023_12_bd_soal-45",
    "level": "N2",
    "prefix": "東鉄道竹山線内にある二つの信号機が故障しており、大事故が",
    "suffix": "明らかになった。",
    "starIndex": 3,
    "options": [
      "起きかねない",
      "続いていたことが",
      "状態が",
      "危険な"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "東鉄道竹山線内にある二つの信号機が故障しており、大事故が ___ ___ _★_ ___ 明らかになった。"
  },
  {
    "id": "n2_2023_12_bd_soal-46",
    "level": "N2",
    "prefix": "（インタビューで）\n「店長になって最初の1年間は大変でした。店長になった",
    "suffix": "と悩むこともありました。」",
    "starIndex": 3,
    "options": [
      "といっても",
      "ばかりで",
      "わからないこと",
      "自分でいいのか"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "（インタビューで）\n「店長になって最初の1年間は大変でした。店長になった ___ ___ _★_ ___ と悩むこともありました。」"
  },
  {
    "id": "n2_2023_12_bd_soal-47",
    "level": "N2",
    "prefix": "家を買うことについて",
    "suffix": "簡単に引っ越せないのが嫌だと言っている。",
    "starIndex": 3,
    "options": [
      "夫は",
      "買ってしまうと",
      "否定的な",
      "一度"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "家を買うことについて ___ ___ _★_ ___ 簡単に引っ越せないのが嫌だと言っている。"
  },
  {
    "id": "n2_2024_07_bd_soal-43",
    "level": "N2",
    "prefix": "「さわら」という魚は、漢字で「鰆」と書く",
    "suffix": "魚の一つです。",
    "starIndex": 2,
    "options": [
      "ように",
      "わかる",
      "ことから",
      "春を代表する"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "「さわら」という魚は、漢字で「鰆」と書く ___ _★_ ___ ___ 魚の一つです。"
  },
  {
    "id": "n2_2024_07_bd_soal-44",
    "level": "N2",
    "prefix": "会議での西山さんのプレゼンは、普段はなかなか",
    "suffix": "素晴らしかった。",
    "starIndex": 3,
    "options": [
      "ぐらい",
      "部長が",
      "褒める",
      "褒めることがない"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "会議での西山さんのプレゼンは、普段はなかなか ___ ___ _★_ ___ 素晴らしかった。"
  },
  {
    "id": "n2_2024_07_bd_soal-45",
    "level": "N2",
    "prefix": "同じ高温",
    "suffix": "は大きく変わる。",
    "starIndex": 3,
    "options": [
      "感じ方",
      "でも",
      "温度や風の強さなど",
      "によって"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "同じ高温 ___ ___ _★_ ___ は大きく変わる。"
  },
  {
    "id": "n2_2024_07_bd_soal-46",
    "level": "N2",
    "prefix": "「山川大学アニメ研究会」は",
    "suffix": "できた団体です。",
    "starIndex": 3,
    "options": [
      "学生が",
      "集まって",
      "アニメが",
      "好きでたまらないという"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "「山川大学アニメ研究会」は ___ ___ _★_ ___ できた団体です。"
  },
  {
    "id": "n2_2024_07_bd_soal-47",
    "level": "N2",
    "prefix": "同じ会社の今井先輩は、自分はミスが多いといつも言っているが、",
    "suffix": "ように見える。",
    "starIndex": 3,
    "options": [
      "新人で",
      "何でも完璧にできている",
      "私からすると",
      "わからないことばかりの"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "同じ会社の今井先輩は、自分はミスが多いといつも言っているが、___ ___ _★_ ___ ように見える。"
  },
  {
    "id": "n2_2024_12_bd_soal-43",
    "level": "N2",
    "prefix": "長く使っている電子レンジが壊れてしまった。古いものだし、修理に",
    "suffix": "買い替えたほうがいいかもしれない。",
    "starIndex": 1,
    "options": [
      "もう",
      "考えると",
      "かかる",
      "費用を"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "長く使っている電子レンジが壊れてしまった。古いものだし、修理に＿＿＿＿＿＿＿★＿＿＿＿買い替えたほうがいいかもしれない。"
  },
  {
    "id": "n2_2024_12_bd_soal-44",
    "level": "N2",
    "prefix": "娘「今度のスピーチコンテスト、参加しようかなあ。でも、自信ないなあ。」\n母「チャレンジ",
    "suffix": "？いい経験になると思うよ。」",
    "starIndex": 1,
    "options": [
      "だけ",
      "みたら",
      "する",
      "して"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "娘「今度のスピーチコンテスト、参加しようかなあ。でも、自信ないなあ。」\n母「チャレンジ＿＿＿＿＿＿＿★＿＿＿＿？いい経験になると思うよ。」"
  },
  {
    "id": "n2_2024_12_bd_soal-45",
    "level": "N2",
    "prefix": "このドレスを着ると、",
    "suffix": "気分になる。",
    "starIndex": 1,
    "options": [
      "映画か何かに",
      "なったような",
      "出てくる",
      "お姫様にでも"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "このドレスを着ると、＿＿＿＿＿＿＿★＿＿＿＿気分になる。"
  },
  {
    "id": "n2_2024_12_bd_soal-46",
    "level": "N2",
    "prefix": "昨日は「母の日」だったので、いつもおいしいお弁当を",
    "suffix": "母が欲しがっていたアクセサリーをプレゼントした。",
    "starIndex": 1,
    "options": [
      "感謝の",
      "作ってくれて",
      "ありがとうという",
      "気持ちを込めて"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "昨日は「母の日」だったので、いつもおいしいお弁当を＿＿＿＿＿＿＿★＿＿＿＿母が欲しがっていたアクセサリーをプレゼントした。"
  },
  {
    "id": "n2_2024_12_bd_soal-47",
    "level": "N2",
    "prefix": "学生時代は、周りの人から、無理して人に合わせようと",
    "suffix": "することが多かった。",
    "starIndex": 1,
    "options": [
      "言えずに",
      "気にするあまり",
      "自分の本当の気持ちを",
      "自分がどう思われているかを"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "学生時代は、周りの人から、無理して人に合わせようと＿＿＿＿＿＿＿★＿＿＿＿することが多かった。"
  },
  {
    "id": "n3_2020_12_bd_soal-g14",
    "level": "N3",
    "prefix": "この喫茶店はコーヒー",
    "suffix": "おいしい。",
    "starIndex": 2,
    "options": [
      "などの",
      "スパゲッティ",
      "料理も",
      "だけでなく"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: だけでなく(4) スパゲッティ(2) などの(1) 料理も(3). Posisi ★ ada di urutan ke-3, yaitu「などの」, menyatakan kafe ini enak bukan hanya kopi tapi juga masakan seperti spageti.",
    "originalPrompt": "この喫茶店はコーヒー　___　___　★　___　おいしい。"
  },
  {
    "id": "n3_2020_12_bd_soal-g15",
    "level": "N3",
    "prefix": "（映画館で）妻「私、ちょっとジュース買いに行ってくるね。」\n夫「うん。あ、でも、映画が",
    "suffix": "よ。急いでね。」",
    "starIndex": 2,
    "options": [
      "しかない",
      "始まる",
      "あと3分",
      "まで"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: 始まる(2) まで(4) あと3分(3) しかない(1). Posisi ★ ada di urutan ke-3, yaitu「あと3分」, memperingatkan film akan mulai hanya dalam 3 menit lagi.",
    "originalPrompt": "（映画館で）妻「私、ちょっとジュース買いに行ってくるね。」\n夫「うん。あ、でも、映画が　___　___　★　___　よ。急いでね。」"
  },
  {
    "id": "n3_2020_12_bd_soal-g16",
    "level": "N3",
    "prefix": "今度の日曜日に友人の結婚式がある。",
    "suffix": "だが。",
    "starIndex": 2,
    "options": [
      "の",
      "いい",
      "晴れる",
      "と"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: 晴れる(3) と(4) いい(2) の(1)だが. Posisi ★ ada di urutan ke-3, yaitu「いい」, menyatakan harapan agar cuaca cerah saat pernikahan teman.",
    "originalPrompt": "今度の日曜日に友人の結婚式がある。　___　___　★　___　だが。"
  },
  {
    "id": "n3_2020_12_bd_soal-g17",
    "level": "N3",
    "prefix": "息子は、サッカークラブの練習がきついと",
    "suffix": "好きだからと思う。",
    "starIndex": 2,
    "options": [
      "よく言っているが",
      "やっぱりサッカーが",
      "続けているのは",
      "それでもやめずに"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: よく言っているが(1) それでもやめずに(4) 続けているのは(3) やっぱりサッカーが(2). Posisi ★ ada di urutan ke-3, yaitu「続けているのは」, menyatakan meski berat, anaknya tetap melanjutkan karena memang menyukai sepak bola.",
    "originalPrompt": "息子は、サッカークラブの練習がきついと　___　___　★　___　好きだからと思う。"
  },
  {
    "id": "n3_2020_12_bd_soal-g18",
    "level": "N3",
    "prefix": "うちから学校まで自転車で40分かかる。電車なら20分だが、朝の",
    "suffix": "自転車で通っている。",
    "starIndex": 2,
    "options": [
      "こんでいる電車は",
      "よい運動になるから",
      "嫌いだし",
      "自転車で行けば"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: こんでいる電車は(1) 嫌いだし(3) よい運動になるから(2) 自転車で行けば(4). Posisi ★ ada di urutan ke-3, yaitu「よい運動になるから」, menyatakan alasan naik sepeda karena tidak suka kereta padat dan sekaligus jadi olahraga.",
    "originalPrompt": "うちから学校まで自転車で40分かかる。電車なら20分だが、朝の　___　___　★　___　自転車で通っている。"
  },
  {
    "id": "n3_2021_12_bd_soal-49",
    "level": "N3",
    "prefix": "この小学生は",
    "suffix": "問題を簡単に解いてしまう。",
    "starIndex": 2,
    "options": [
      "大人",
      "ような",
      "でも",
      "解けない"
    ],
    "correctIndex": 2,
    "explanation": "「でも」= meskipun begitu/namun. Tepat untuk posisi ★ dalam kalimat: anak SD ini namun bisa selesaikan soal dengan mudah.",
    "originalPrompt": "この小学生は　___　___　★　___　問題を簡単に解いてしまう。"
  },
  {
    "id": "n3_2021_12_bd_soal-50",
    "level": "N3",
    "prefix": "去年、初めて一人で海外を旅行した。行く前は心配なこともあったが、",
    "suffix": "だった。",
    "starIndex": 2,
    "options": [
      "楽しいこと",
      "ばかり",
      "旅行していた",
      "2週間は"
    ],
    "correctIndex": 0,
    "explanation": "「楽しいこと」= hal yang menyenangkan. Tepat untuk posisi ★: ternyata perjalanan menjadi hal yang menyenangkan.",
    "originalPrompt": "去年、初めて一人で海外を旅行した。行く前は心配なこともあったが、　___　___　★　___　だった。"
  },
  {
    "id": "n3_2021_12_bd_soal-51",
    "level": "N3",
    "prefix": "A「昨日は日曜日だったから、遊園地は人が多かったでしょう?」\nB「いや、",
    "suffix": "いませんでしたよ。」",
    "starIndex": 2,
    "options": [
      "いた",
      "込んで",
      "ほど",
      "思って"
    ],
    "correctIndex": 2,
    "explanation": "「ほど」= se... dibandingkan. Tepat untuk posisi ★: tidak sebanyak yang dikira (tidak sebanyak itu orangnya).",
    "originalPrompt": "A「昨日は日曜日だったから、遊園地は人が多かったでしょう?」\nB「いや、　___　___　★　___　いませんでしたよ。」"
  },
  {
    "id": "n3_2021_12_bd_soal-52",
    "level": "N3",
    "prefix": "一人暮らしを始めて、両親が毎日仕事を",
    "suffix": "なことだったか、よくわかった。",
    "starIndex": 2,
    "options": [
      "どれだけ",
      "しながら",
      "食事の準備や洗濯を",
      "してくれていたことが"
    ],
    "correctIndex": 3,
    "explanation": "「してくれていたことが」= hal bahwa mereka telah melakukan (untuk saya). Tepat untuk ★: baru sadar berapa berat kerja orang tua.",
    "originalPrompt": "一人暮らしを始めて、両親が毎日仕事を　___　___　★　___　なことだったか、よくわかった。"
  },
  {
    "id": "n3_2021_12_bd_soal-53",
    "level": "N3",
    "prefix": "患者「先生、おふろには入ってもいいんでしょうか。」\n医者「",
    "suffix": "いいですよ。」",
    "starIndex": 2,
    "options": [
      "なって",
      "いたら",
      "熱が下がって",
      "あしたに"
    ],
    "correctIndex": 2,
    "explanation": "「熱が下がって」= demam sudah turun. Tepat untuk ★: setelah demam turun, boleh mandi.",
    "originalPrompt": "患者「先生、おふろには入ってもいいんでしょうか。」\n医者「　___　___　★　___　いいですよ。」"
  },
  {
    "id": "n3_2022_07_bd_soal-14",
    "level": "N3",
    "prefix": "私は、森先生の授業を受けてから数学が好きになった",
    "suffix": "いないと思う。",
    "starIndex": 2,
    "options": [
      "先生は",
      "先生ほど",
      "あの",
      "わかりやすく教えてくれる"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: あの(3) わかりやすく教えてくれる(4) 先生ほど(2) 先生は(1). Posisi ★ ada di urutan ke-3, yaitu「先生ほど」, menyatakan tidak ada guru lain sebaik guru itu dalam mengajar.",
    "originalPrompt": "私は、森先生の授業を受けてから数学が好きになった　___　___　★　___　いないと思う。"
  },
  {
    "id": "n3_2022_07_bd_soal-15",
    "level": "N3",
    "prefix": "「今日は、コーラを使った鶏肉の煮物を紹介します。鶏肉は",
    "suffix": "知っていますか。」",
    "starIndex": 2,
    "options": [
      "煮ることで",
      "柔らかく",
      "コーラで",
      "なるのを"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: コーラで(3) 煮ることで(1) 柔らかく(2) なるのを(4). Posisi ★ ada di urutan ke-3, yaitu「コーラで」, menjelaskan cara memasak ayam dengan cola agar lebih empuk.",
    "originalPrompt": "「今日は、コーラを使った鶏肉の煮物を紹介します。鶏肉は　___　___　★　___　知っていますか。」"
  },
  {
    "id": "n3_2022_07_bd_soal-16",
    "level": "N3",
    "prefix": "山下「今度、北森町に行くんだけど、北森町のレストランでどこかいいところ、知ってる？」\\n南「私はあまり知らないんだけど、田中さん",
    "suffix": "どう？」",
    "starIndex": 2,
    "options": [
      "が",
      "聞いてみたら",
      "から",
      "北森町に住んでいる"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: が(1) 北森町に住んでいる(4) から(3) 聞いてみたら(2). Posisi ★ ada di urutan ke-3, yaitu「聞いてみたら」, menyarankan bertanya pada Tanaka karena dia tinggal di Kitamori.",
    "originalPrompt": "山下「今度、北森町に行くんだけど、北森町のレストランでどこかいいところ、知ってる？」\\n南「私はあまり知らないんだけど、田中さん　___　___　★　___　どう？」"
  },
  {
    "id": "n3_2022_07_bd_soal-17",
    "level": "N3",
    "prefix": "林「タンさんは、夏休みに国へ帰りますか。」\\nタン「いいえ、今年は帰りません。日本で",
    "suffix": "なので楽しみです。」",
    "starIndex": 2,
    "options": [
      "今年が",
      "過ごすのは",
      "初めて",
      "夏休みを"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: 今年が(1) 夏休みを(4) 過ごすのは(2) 初めて(3). Posisi ★ ada di urutan ke-3, yaitu「初めて」, menyatakan ini pertama kalinya menghabiskan liburan musim panas di Jepang.",
    "originalPrompt": "林「タンさんは、夏休みに国へ帰りますか。」\\nタン「いいえ、今年は帰りません。日本で　___　___　★　___　なので楽しみです。」"
  },
  {
    "id": "n3_2022_07_bd_soal-18",
    "level": "N3",
    "prefix": "さくら大学の周りには、レストランや喫茶店などの",
    "suffix": "ある。",
    "starIndex": 2,
    "options": [
      "中心に",
      "飲食店を",
      "いろいろな店が",
      "本屋や美容院など"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: 飲食店を(2) 中心に(1) いろいろな店が(3) 本屋や美容院など(4). Posisi ★ ada di urutan ke-3, yaitu「いろいろな店が」, menyatakan berbagai macam toko (toko buku, salon, dll) berada di sekitar restoran dan kafe.",
    "originalPrompt": "さくら大学の周りには、レストランや喫茶店などの　___　___　★　___　ある。"
  },
  {
    "id": "n3_2022_12_bd_soal-14",
    "level": "N3",
    "prefix": "留学している息子",
    "suffix": "毎日楽しく過ごしていると書かれていて安心した。",
    "starIndex": 1,
    "options": [
      "メール",
      "から",
      "に",
      "の"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: の(4) メール(1) に(3) から(2). Posisi ★ ada di urutan ke-2, yaitu「メール」, merujuk pada surel dari anak yang sedang belajar di luar negeri, yang membuat penulis merasa tenang.",
    "originalPrompt": "留学している息子　___　★　___　___　毎日楽しく過ごしていると書かれていて安心した。"
  },
  {
    "id": "n3_2022_12_bd_soal-15",
    "level": "N3",
    "prefix": "来週から1か月間、出張で東京に行く。東京には",
    "suffix": "一緒に食事でもしたいと思う。",
    "starIndex": 2,
    "options": [
      "いるので",
      "いる間に",
      "友達が",
      "東京に"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: 友達が(3) 東京に(4) いる間に(2) いるので(1). Posisi ★ ada di urutan ke-3, yaitu「いる間に」, menyatakan ingin makan bersama teman selama berada di Tokyo.",
    "originalPrompt": "来週から1か月間、出張で東京に行く。東京には　___　___　★　___　一緒に食事でもしたいと思う。"
  },
  {
    "id": "n3_2022_12_bd_soal-16",
    "level": "N3",
    "prefix": "バイオリンが",
    "suffix": "こんなに面白い楽器はないと感じる。",
    "starIndex": 2,
    "options": [
      "年前に習い始めたのだが",
      "弾くほど",
      "弾けば",
      "弾けるようになりたくて"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: 年前に習い始めたのだが(1) 弾けるようになりたくて(4) 弾けば(3) 弾くほど(2). Posisi ★ ada di urutan ke-3, yaitu「弾けば」, pola「〜ば〜ほど」menyatakan semakin dimainkan, biola terasa semakin menarik.",
    "originalPrompt": "バイオリンが　___　___　★　___　こんなに面白い楽器はないと感じる。"
  },
  {
    "id": "n3_2022_12_bd_soal-17",
    "level": "N3",
    "prefix": "A「お誕生日おめでとう。これ、プレゼントだよ。」\\nB「わあ、かばんだ。ちょうど",
    "suffix": "んだ。ありがとう。」",
    "starIndex": 2,
    "options": [
      "こういう色の",
      "欲しい",
      "と思っていた",
      "かばんが"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: こういう色の(1) かばんが(4) 欲しい(2) と思っていた(3). Posisi ★ ada di urutan ke-3, yaitu「欲しい」, menyatakan sudah lama menginginkan tas dengan warna seperti itu.",
    "originalPrompt": "A「お誕生日おめでとう。これ、プレゼントだよ。」\\nB「わあ、かばんだ。ちょうど　___　___　★　___　んだ。ありがとう。」"
  },
  {
    "id": "n3_2022_12_bd_soal-18",
    "level": "N3",
    "prefix": "都会と田舎には違うところも多いが、どちらも、人が働き、",
    "suffix": "。",
    "starIndex": 2,
    "options": [
      "という点で",
      "違いは",
      "生活している",
      "ない"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: 生活している(3) という点で(1) 違いは(2) ない(4). Posisi ★ ada di urutan ke-3, yaitu「違いは」, menyatakan tidak ada perbedaan dalam hal bekerja dan menjalani hidup, baik di kota maupun desa.",
    "originalPrompt": "都会と田舎には違うところも多いが、どちらも、人が働き、　___　___　★　___　。"
  },
  {
    "id": "n3_2023_07_bd_soal-14",
    "level": "N3",
    "prefix": "パソコンや携帯電話の",
    "suffix": "原因で、頭が痛くなることもあるそうだ。",
    "starIndex": 2,
    "options": [
      "が",
      "による",
      "見すぎ",
      "目の疲れ"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: 目の疲れ(4) 見すぎ(3) による(2) が(1). Posisi ★ ada di urutan ke-3, yaitu「による」, menyatakan 'disebabkan oleh' kelelahan mata akibat kebanyakan melihat layar.",
    "originalPrompt": "パソコンや携帯電話の　___　___　★　___　原因で、頭が痛くなることもあるそうだ。"
  },
  {
    "id": "n3_2023_07_bd_soal-15",
    "level": "N3",
    "prefix": "私は子供の時、ピアノを習っていたが、3年でやめてしまった。何回",
    "suffix": "嫌になってしまったのだ。",
    "starIndex": 2,
    "options": [
      "上手に弾けない",
      "練習しても",
      "なかなか",
      "曲があって"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: 練習しても(2) なかなか(3) 上手に弾けない(1) 曲があって(4). Posisi ★ ada di urutan ke-3, yaitu「上手に弾けない」, menyatakan sudah berlatih berkali-kali tetap tidak bisa mahir.",
    "originalPrompt": "私は子供の時、ピアノを習っていたが、3年でやめてしまった。何回　___　___　★　___　嫌になってしまったのだ。"
  },
  {
    "id": "n3_2023_07_bd_soal-16",
    "level": "N3",
    "prefix": "失敗をすることは誰にでもある。大切な",
    "suffix": "考えて、同じ失敗を繰り返さないようにすることだ。",
    "starIndex": 2,
    "options": [
      "失敗をしてしまった",
      "どうして",
      "のか",
      "のは"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: のは(4) どうして(2) 失敗をしてしまった(1) のか(3). Posisi ★ ada di urutan ke-3, yaitu「失敗をしてしまった」, tentang memikirkan mengapa kegagalan itu terjadi.",
    "originalPrompt": "失敗をすることは誰にでもある。大切な　___　___　★　___　考えて、同じ失敗を繰り返さないようにすることだ。"
  },
  {
    "id": "n3_2023_07_bd_soal-17",
    "level": "N3",
    "prefix": "（教室で）南「西川さんの誕生日に、何かプレゼントをあげない？」\\n森「いいね。スポーツが好きだと言っていた",
    "suffix": "？」",
    "starIndex": 2,
    "options": [
      "いいんじゃない",
      "から",
      "とか",
      "タオル"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: タオル(4) とか(3) いいんじゃない(1) から(2). Posisi ★ ada di urutan ke-3, yaitu「とか」, menyatakan pilihan seperti handuk sebagai contoh hadiah.",
    "originalPrompt": "（教室で）南「西川さんの誕生日に、何かプレゼントをあげない？」\\n森「いいね。スポーツが好きだと言っていた　___　___　★　___　？」"
  },
  {
    "id": "n3_2023_07_bd_soal-18",
    "level": "N3",
    "prefix": "（講演会で）司会者「本日は、鳥の",
    "suffix": "見ることができる様々な鳥について、お話をしていただきます。」",
    "starIndex": 2,
    "options": [
      "専門家で",
      "都会で",
      "いらっしゃる",
      "山下花子先生に"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: 都会で(2) いらっしゃる(3) 山下花子先生に(4) 専門家で(1). Posisi ★ ada di urutan ke-3, yaitu「山下花子先生に」, memperkenalkan pembicara sebagai ahli burung.",
    "originalPrompt": "（講演会で）司会者「本日は、鳥の　___　___　★　___　見ることができる様々な鳥について、お話をしていただきます。」"
  },
  {
    "id": "n3_2023_12_bd_soal-14",
    "level": "N3",
    "prefix": "私は歌手の石川あかりが大好きだ。彼女",
    "suffix": "いないと思う。",
    "starIndex": 3,
    "options": [
      "声がきれいな",
      "は",
      "歌手",
      "ほど"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: は(2) 歌手(3) 声がきれいな(1) ほど(4). Posisi ★ ada di urutan ke-4, yaitu「ほど」, menyatakan tidak ada penyanyi lain yang bersuara semerdu dia.",
    "originalPrompt": "私は歌手の石川あかりが大好きだ。彼女　___　___　___　★　いないと思う。"
  },
  {
    "id": "n3_2023_12_bd_soal-15",
    "level": "N3",
    "prefix": "最近は野菜や魚などの食料品も",
    "suffix": "ニュースで知った。",
    "starIndex": 1,
    "options": [
      "人が",
      "増えてきている",
      "インターネットで買う",
      "ということを"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: インターネットで買う(3) 人が(1) 増えてきている(2) ということを(4). Posisi ★ ada di urutan ke-2, yaitu「増えてきている」, menyatakan makin bertambah orang yang belanja bahan makanan secara daring.",
    "originalPrompt": "最近は野菜や魚などの食料品も　___　★　___　___　ニュースで知った。"
  },
  {
    "id": "n3_2023_12_bd_soal-16",
    "level": "N3",
    "prefix": "（大学で）\\n中山「林先輩、ゼミの発表で使う資料を作ったんですが、",
    "suffix": "でしょうか。」\\n林「いいですよ。」",
    "starIndex": 2,
    "options": [
      "もらえない",
      "ところがあるので",
      "一度チェックして",
      "自信がない"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: 自信がない(4) ところがあるので(2) 一度チェックして(3) もらえない(1). Posisi ★ ada di urutan ke-3, yaitu「一度チェックして」, meminta tolong diperiksa sekali karena kurang yakin dengan materinya.",
    "originalPrompt": "（大学で）\\n中山「林先輩、ゼミの発表で使う資料を作ったんですが、　___　___　★　___　でしょうか。」\\n林「いいですよ。」"
  },
  {
    "id": "n3_2023_12_bd_soal-17",
    "level": "N3",
    "prefix": "今朝は急いでいたから、",
    "suffix": "しまった。",
    "starIndex": 2,
    "options": [
      "玄関の電気を消すのを",
      "きて",
      "家を出て",
      "忘れて"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: 玄関の電気を消すのを(1) 忘れて(4) 家を出て(3) きて(2). Posisi ★ ada di urutan ke-3, yaitu「家を出て」, menyatakan sudah lupa mematikan lampu lalu keluar rumah.",
    "originalPrompt": "今朝は急いでいたから、　___　___　★　___　しまった。"
  },
  {
    "id": "n3_2023_12_bd_soal-18",
    "level": "N3",
    "prefix": "読書が趣味の友人は、いつどんな本を読んだかを",
    "suffix": "そうだ。",
    "starIndex": 0,
    "options": [
      "必ずノートに記録する",
      "忘れない",
      "ように",
      "ことにしている"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: 忘れない(2) ように(3) 必ずノートに記録する(1) ことにしている(4). Posisi ★ ada di urutan ke-1, yaitu「必ずノートに記録する」, kebiasaan selalu mencatat di buku agar tidak lupa.",
    "originalPrompt": "読書が趣味の友人は、いつどんな本を読んだかを　★　___　___　___　そうだ。"
  },
  {
    "id": "n3_2024_07_bd_soal-14",
    "level": "N3",
    "prefix": "朝、近所のパン屋の前を通ると、パン",
    "suffix": "する。",
    "starIndex": 2,
    "options": [
      "が",
      "焼ける",
      "の",
      "いいにおい"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: の(3) 焼ける(2) いいにおい(4) が(1). Posisi ★ ada di urutan ke-3, yaitu「いいにおい」.",
    "originalPrompt": "朝、近所のパン屋の前を通ると、パン　___　___　★　___　する。"
  },
  {
    "id": "n3_2024_07_bd_soal-15",
    "level": "N3",
    "prefix": "平日はなかなか運動する時間がないので、日常生活の中で、エレベーターではなくて階段を",
    "suffix": "とかしている。",
    "starIndex": 3,
    "options": [
      "とか",
      "歩く",
      "使う",
      "スピードを速くする"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: 使う(3) とか(1) 歩く(2) スピードを速くする(4). Posisi ★ ada di urutan ke-4, yaitu「スピードを速くする」.",
    "originalPrompt": "平日はなかなか運動する時間がないので、日常生活の中で、エレベーターではなくて階段を　___　___　___　★　とかしている。"
  },
  {
    "id": "n3_2024_07_bd_soal-16",
    "level": "N3",
    "prefix": "森田「西山さん、新しいアルバイトはどうですか。」\n西山「始めた",
    "suffix": "大変ですが、楽しいです。」",
    "starIndex": 2,
    "options": [
      "多くて",
      "覚えなければいけない",
      "ことが",
      "ばかりなので"
    ],
    "correctIndex": 2,
    "explanation": "Urutan yang benar: 始めた ばかりなので(4) 覚えなければいけない(2) ことが(3) 多くて(1). Posisi ★ ada di urutan ke-3, yaitu「ことが」.",
    "originalPrompt": "森田「西山さん、新しいアルバイトはどうですか。」\n西山「始めた　___　___　★　___　大変ですが、楽しいです。」"
  },
  {
    "id": "n3_2024_07_bd_soal-17",
    "level": "N3",
    "prefix": "初めて登山をしたとき、山の上からの景色を見て、「",
    "suffix": "」と感動した。",
    "starIndex": 2,
    "options": [
      "きれいな",
      "なんて",
      "なんだろう",
      "眺め"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: なんて(2) きれいな(1) 眺め(4) なんだろう(3). Posisi ★ ada di urutan ke-3, yaitu「眺め」.",
    "originalPrompt": "初めて登山をしたとき、山の上からの景色を見て、「　___　___　★　___　」と感動した。"
  },
  {
    "id": "n3_2024_07_bd_soal-18",
    "level": "N3",
    "prefix": "（会社で）\n田中「ねえ、知ってる？営業課の山下さん、来月「",
    "suffix": "。」\n石川「え、そうなんだ。知らなかった。」",
    "starIndex": 2,
    "options": [
      "結婚するんだ",
      "って",
      "と",
      "受付の林さん"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: 受付の林さん(4) と(3) 結婚するんだ(1) って(2). Posisi ★ ada di urutan ke-3, yaitu「結婚するんだ」.",
    "originalPrompt": "（会社で）\n田中「ねえ、知ってる？営業課の山下さん、来月「　___　___　★　___　。」\n石川「え、そうなんだ。知らなかった。」"
  },
  {
    "id": "n3_2024_12_bd_soal-14",
    "level": "N3",
    "prefix": "山川大学では、新入生が",
    "suffix": "について、毎年4月にアンケート調査を行っている。",
    "starIndex": 2,
    "options": [
      "大学生活",
      "持っている",
      "に対して",
      "イメージ"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: 大学生活(1) に対して(3) 持っている(2) イメージ(4). Posisi ★ ada di urutan ke-3, yaitu「持っている」.",
    "originalPrompt": "山川大学では、新入生が　___　___　★　___　について、毎年4月にアンケート調査を行っている。"
  },
  {
    "id": "n3_2024_12_bd_soal-15",
    "level": "N3",
    "prefix": "来週の夫の誕生日には、",
    "suffix": "つもりだ。",
    "starIndex": 0,
    "options": [
      "最近",
      "プレゼントする",
      "かばんを",
      "欲しがっている"
    ],
    "correctIndex": 0,
    "explanation": "Urutan yang benar: 最近(1) 欲しがっている(4) 鞄を(3) プレゼントする(2). Posisi ★ ada di urutan ke-1, yaitu「最近」.",
    "originalPrompt": "来週の夫の誕生日には、　★　___　___　___　つもりだ。"
  },
  {
    "id": "n3_2024_12_bd_soal-16",
    "level": "N3",
    "prefix": "私は、健康の",
    "suffix": "。",
    "starIndex": 2,
    "options": [
      "している",
      "ために",
      "毎日8時間以上寝る",
      "ように"
    ],
    "correctIndex": 3,
    "explanation": "Urutan yang benar: 健康の ために(2) 毎日8時間以上寝る(3) ように(4) している(1). Posisi ★ ada di urutan ke-3, yaitu「ように」.",
    "originalPrompt": "私は、健康の　___　___　★　___　。"
  },
  {
    "id": "n3_2024_12_bd_soal-17",
    "level": "N3",
    "prefix": "部長が",
    "suffix": "クッキーがとてもおいしいので、私も東京に行くことがあったら、買おうと思う。",
    "starIndex": 2,
    "options": [
      "たびに",
      "買ってきてくれる",
      "お土産の",
      "東京へ出張に行く"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: 東京へ出張に行く(4) たびに(1) 買ってきてくれる(2) お土産の(3). Posisi ★ ada di urutan ke-3, yaitu「買ってきてくれる」.",
    "originalPrompt": "部長が　___　___　★　___　クッキーがとてもおいしいので、私も東京に行くことがあったら、買おうと思う。"
  },
  {
    "id": "n3_2024_12_bd_soal-18",
    "level": "N3",
    "prefix": "私はこの図書館が好きだ。広くて本の数が多い",
    "suffix": "いい。",
    "starIndex": 1,
    "options": [
      "景色を楽しみながら",
      "大きな窓から海が見えて",
      "だけでなく",
      "読書ができるのも"
    ],
    "correctIndex": 1,
    "explanation": "Urutan yang benar: 多い だけでなく(3) 大きな窓から海が見えて(2) 景色を楽しみながら(1) 読書ができるのも(4). Posisi ★ ada di urutan ke-2, yaitu「大きな窓から海が見えて」.",
    "originalPrompt": "私はこの図書館が好きだ。広くて本の数が多い　___　★　___　___　いい。"
  },
  {
    "id": "n3_2025_07_bd_soal-14",
    "level": "N3",
    "prefix": "今年の夏も暑いが、",
    "suffix": "ずっと涼しく感じる。",
    "starIndex": 3,
    "options": [
      "異常な",
      "比べると",
      "暑さだった",
      "去年の夏に"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "今年の夏も暑いが、　___　___　___　★　ずっと涼しく感じる。"
  },
  {
    "id": "n3_2025_07_bd_soal-15",
    "level": "N3",
    "prefix": "初めてアルバイトをして、お金を稼ぐ",
    "suffix": "わかった。",
    "starIndex": 0,
    "options": [
      "ことか",
      "大変な",
      "ことが",
      "どれだけ"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "初めてアルバイトをして、お金を稼ぐ　★　___　___　___　わかった。"
  },
  {
    "id": "n3_2025_07_bd_soal-16",
    "level": "N3",
    "prefix": "今日、昼食の後、図書館へ行って本を読んでいたら",
    "suffix": "。",
    "starIndex": 1,
    "options": [
      "ので",
      "外が暗くなっていた",
      "驚いた",
      "いつのまにか"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "今日、昼食の後、図書館へ行って本を読んでいたら　___　★　___　___　。"
  },
  {
    "id": "n3_2025_07_bd_soal-17",
    "level": "N3",
    "prefix": "このチーズケーキの",
    "suffix": "、誰でも簡単に作れると思う。",
    "starIndex": 2,
    "options": [
      "だから",
      "作り方は",
      "だけ",
      "材料を混ぜて冷やす"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "このチーズケーキの　___　___　★　___　、誰でも簡単に作れると思う。"
  },
  {
    "id": "n3_2025_07_bd_soal-18",
    "level": "N3",
    "prefix": "A「あさってのサッカーの試合、応援に行くね。天気予報では曇りと言っていたけど、雨だったら中止になる？」\nB「ありがとう。もし",
    "suffix": "応援には無理して来なくてもいいよ。」",
    "starIndex": 2,
    "options": [
      "雨が降ったら",
      "試合は",
      "雨が降ったとしても",
      "中止にならないんだけど"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "A「あさってのサッカーの試合、応援に行くね。天気予報では曇りと言っていたけど、雨だったら中止になる？」\nB「ありがとう。もし　___　___　★　___　応援には無理して来なくてもいいよ。」"
  },
  {
    "id": "n3_2025_12_bd_soal-14",
    "level": "N3",
    "prefix": "昨日、本屋で小説2冊",
    "suffix": "本を1冊買った。",
    "starIndex": 0,
    "options": [
      "と",
      "の",
      "について",
      "レポートの書き方"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "昨日、本屋で小説2冊　★　___　___　___　本を1冊買った。"
  },
  {
    "id": "n3_2025_12_bd_soal-15",
    "level": "N3",
    "prefix": "（道で）\nA「あの喫茶店、",
    "suffix": "があるよ。入ってみない？」\nB「いいね。」",
    "starIndex": 3,
    "options": [
      "で",
      "か何か",
      "テレビ",
      "見たこと"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "（道で）\nA「あの喫茶店、　___　___　___　★　があるよ。入ってみない？」\nB「いいね。」"
  },
  {
    "id": "n3_2025_12_bd_soal-16",
    "level": "N3",
    "prefix": "半年前にギターを習い始めてから、毎日練習している。弾けば",
    "suffix": "自分でもわかり、とても楽しい。",
    "starIndex": 1,
    "options": [
      "上手に",
      "弾くほど",
      "なっていくのが",
      "弾けるように"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "半年前にギターを習い始めてから、毎日練習している。弾けば　___　★　___　___　自分でもわかり、とても楽しい。"
  },
  {
    "id": "n3_2025_12_bd_soal-17",
    "level": "N3",
    "prefix": "今の会社に就職したときに、北町で一人暮らしを始めた。会社から遠い",
    "suffix": "からだ。",
    "starIndex": 3,
    "options": [
      "北町を選んだ",
      "のは",
      "ずっと北町に住んでみたかった",
      "のに"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "今の会社に就職したときに、北町で一人暮らしを始めた。会社から遠い　___　___　___　★　からだ。"
  },
  {
    "id": "n3_2025_12_bd_soal-18",
    "level": "N3",
    "prefix": "お風呂は家の中でも特にかびが生えやすい場所だ。かびを防ぐ",
    "suffix": "重要らしい。",
    "starIndex": 1,
    "options": [
      "ことが",
      "使った後",
      "ぬれたままにしない",
      "ためには"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "お風呂は家の中でも特にかびが生えやすい場所だ。かびを防ぐ　___　★　___　___　重要らしい。"
  },
  {
    "id": "n4_001_bp_16",
    "level": "N4",
    "prefix": "先月まで 花屋が あった",
    "suffix": "おいしいです。",
    "starIndex": 2,
    "options": [
      "できた",
      "りんごの ケーキが",
      "きっさてんは",
      "場所に"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "先月まで 花屋が あった _____ _____ ★ _____ おいしいです。"
  },
  {
    "id": "n4_001_bp_17",
    "level": "N4",
    "prefix": "きのうの 夜 家に 帰ってから、かぎを",
    "suffix": "覚えて いません。",
    "starIndex": 2,
    "options": [
      "どこ",
      "置いた",
      "に",
      "か"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "きのうの 夜 家に 帰ってから、かぎを _____ _____ ★ _____ 覚えて いません。"
  },
  {
    "id": "n4_001_bp_18",
    "level": "N4",
    "prefix": "私は ピアノを",
    "suffix": "時間が ありません。",
    "starIndex": 2,
    "options": [
      "ひくのが",
      "ひく",
      "最近 いそがしくて",
      "好きですが"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "私は ピアノを _____ _____ ★ _____ 時間が ありません。"
  },
  {
    "id": "n4_001_bp_19",
    "level": "N4",
    "prefix": "私は 20さいの たんじょうびに そふが",
    "suffix": "います。",
    "starIndex": 2,
    "options": [
      "大切に",
      "くれた",
      "使って",
      "カメラを"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "私は 20さいの たんじょうびに そふが _____ _____ ★ _____ います。"
  },
  {
    "id": "n4_001_bp_20",
    "level": "N4",
    "prefix": "林「来週、野球の 試合を 見に 行こうと 思って いるんですが、リーさんも いっしょに どうですか。」リー「えっ、野球の 試合ですか。いいですね。",
    "suffix": "です。」",
    "starIndex": 2,
    "options": [
      "ぜひ 行きたい",
      "ことが ない",
      "見に 行った",
      "ので"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "林「来週、野球の 試合を 見に 行こうと 思って いるんですが、リーさんも いっしょに どうですか。」リー「えっ、野球の 試合ですか。いいですね。_____ _____ ★ _____ です。」"
  },
  {
    "id": "n4_002_bd_14",
    "level": "N4",
    "prefix": "今日は、一年で",
    "suffix": "です。",
    "starIndex": 0,
    "options": [
      "日",
      "が",
      "夜",
      "最も長い"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "今日は、一年で ★ です。"
  },
  {
    "id": "n4_002_bd_15",
    "level": "N4",
    "prefix": "私は、日本に",
    "suffix": "写真をたくさんとりたいです。",
    "starIndex": 0,
    "options": [
      "いろいろな町へ",
      "行って",
      "間に",
      "いる"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "私は、日本に ★ 写真をたくさんとりたいです。"
  },
  {
    "id": "n4_002_bd_16",
    "level": "N4",
    "prefix": "",
    "suffix": "、私は小さいとき、この絵本が大好きだったそ",
    "starIndex": 0,
    "options": [
      "によると",
      "話",
      "母",
      "の"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "★ 、私は小さいとき、この絵本が大好きだったそ"
  },
  {
    "id": "n5_001_bp_17",
    "level": "N5",
    "prefix": "A「すみません、つぎの",
    "suffix": "まがってください。」B「はい、わかりました。」",
    "starIndex": 2,
    "options": [
      "を",
      "右",
      "に",
      "しんごう"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "A「すみません、つぎの _____ _____ ★ _____ まがってください。」B「はい、わかりました。」"
  },
  {
    "id": "n5_001_bp_18",
    "level": "N5",
    "prefix": "私は 日曜日に 兄",
    "suffix": "で出かけました。",
    "starIndex": 2,
    "options": [
      "と",
      "いっしょに",
      "の",
      "子ども"
    ],
    "correctIndex": 0,
    "explanation": "",
    "originalPrompt": "私は 日曜日に 兄 _____ _____ ★ _____ で出かけました。"
  },
  {
    "id": "n5_001_bp_19",
    "level": "N5",
    "prefix": "きのう 買った おかしは",
    "suffix": "でした。",
    "starIndex": 2,
    "options": [
      "色",
      "が",
      "きれい",
      "まるくて"
    ],
    "correctIndex": 1,
    "explanation": "",
    "originalPrompt": "きのう 買った おかしは _____ _____ ★ _____ でした。"
  },
  {
    "id": "n5_001_bp_20",
    "level": "N5",
    "prefix": "駅の",
    "suffix": "で ざっしを 買いました。",
    "starIndex": 2,
    "options": [
      "近く",
      "本屋",
      "に",
      "ある"
    ],
    "correctIndex": 3,
    "explanation": "",
    "originalPrompt": "駅の _____ _____ ★ _____ で ざっしを 買いました。"
  },
  {
    "id": "n5_001_bp_21",
    "level": "N5",
    "prefix": "先週",
    "suffix": "の こうちゃは とてもおいしかったです。",
    "starIndex": 2,
    "options": [
      "外国",
      "に",
      "もらった",
      "ともだち"
    ],
    "correctIndex": 2,
    "explanation": "",
    "originalPrompt": "先週 _____ _____ ★ _____ の こうちゃは とてもおいしかったです。"
  }
];

export function getRandomStarQuestions(
  levelFilter?: string,
  count = 20
): StarQuestion[] {
  let pool = JLPT_STAR_QUESTIONS;
  if (levelFilter && levelFilter !== 'all') {
    pool = pool.filter(q => q.level.toLowerCase() === levelFilter.toLowerCase());
  }
  if (pool.length === 0) pool = JLPT_STAR_QUESTIONS;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
