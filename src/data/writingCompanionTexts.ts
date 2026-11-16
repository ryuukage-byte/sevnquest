// Paragraf kurasi khusus Writing Companion: 7 paragraf per level (N5–N1), masing-masing satu paragraf
// pendek untuk disalin dengan tangan, lengkap dengan terjemahan Indonesia per kalimat.
// Kosakata & pola disesuaikan level; teks ditulis khusus untuk SevnQuest.

import type { DokkaiLevel } from '../engine/dokkaiStudy/types';

export interface CompanionText {
  id: string;
  level: DokkaiLevel;
  /** Judul Indonesia singkat (topik). */
  topic: string;
  /** Pasangan [kalimat Jepang, terjemahan Indonesia]. */
  sentences: [string, string][];
}

export const COMPANION_TEXTS: CompanionText[] = [
  // ---------------------------------------------------------------- N5
  { id: 'wc-n5-1', level: 'N5', topic: 'Keluargaku', sentences: [
    ['わたしの家族は四人です。', 'Keluarga saya berjumlah empat orang.'],
    ['父と母と姉とわたしです。', 'Ayah, ibu, kakak perempuan, dan saya.'],
    ['父は会社員で、母は先生です。', 'Ayah karyawan perusahaan, dan ibu seorang guru.'],
    ['姉は大学で英語を勉強しています。', 'Kakak perempuan belajar bahasa Inggris di universitas.'],
    ['日曜日はみんなで晩ご飯を食べます。', 'Pada hari Minggu kami semua makan malam bersama.'],
  ] },
  { id: 'wc-n5-2', level: 'N5', topic: 'Pagi hari', sentences: [
    ['わたしは毎朝六時に起きます。', 'Saya bangun setiap pagi pukul enam.'],
    ['顔を洗って、朝ご飯を食べます。', 'Saya mencuci muka, lalu sarapan.'],
    ['朝ご飯はパンと牛乳です。', 'Sarapan saya roti dan susu.'],
    ['七時半に家を出て、駅まで歩きます。', 'Pukul setengah delapan saya keluar rumah dan berjalan kaki sampai stasiun.'],
    ['電車で学校へ行きます。', 'Saya pergi ke sekolah naik kereta.'],
  ] },
  { id: 'wc-n5-3', level: 'N5', topic: 'Kamarku', sentences: [
    ['わたしの部屋はあまり広くありません。', 'Kamar saya tidak terlalu luas.'],
    ['机の上にパソコンと本があります。', 'Di atas meja ada komputer dan buku.'],
    ['窓の近くに小さい木があります。', 'Di dekat jendela ada pohon kecil.'],
    ['ベッドの下にねこがいます。', 'Di bawah tempat tidur ada kucing.'],
    ['わたしはこの部屋が好きです。', 'Saya suka kamar ini.'],
  ] },
  { id: 'wc-n5-4', level: 'N5', topic: 'Belanja', sentences: [
    ['きのう、友だちとデパートへ行きました。', 'Kemarin saya pergi ke department store bersama teman.'],
    ['わたしは青いシャツを買いました。', 'Saya membeli kemeja biru.'],
    ['シャツは三千円でした。', 'Kemejanya seharga tiga ribu yen.'],
    ['それから、きっさてんでコーヒーを飲みました。', 'Setelah itu, kami minum kopi di kafe.'],
    ['とても楽しかったです。', 'Sangat menyenangkan.'],
  ] },
  { id: 'wc-n5-5', level: 'N5', topic: 'Cuaca', sentences: [
    ['今日は雨です。', 'Hari ini hujan.'],
    ['とても寒いです。', 'Sangat dingin.'],
    ['わたしは傘を持って、学校へ行きました。', 'Saya pergi ke sekolah membawa payung.'],
    ['あしたは天気がいいでしょう。', 'Besok cuacanya mungkin akan bagus.'],
    ['あしたは山へ行きたいです。', 'Besok saya ingin pergi ke gunung.'],
  ] },
  { id: 'wc-n5-6', level: 'N5', topic: 'Temanku', sentences: [
    ['田中さんはわたしの友だちです。', 'Tanaka adalah teman saya.'],
    ['田中さんは背が高くて、やさしい人です。', 'Tanaka orangnya tinggi dan baik hati.'],
    ['毎週土曜日、いっしょにテニスをします。', 'Setiap hari Sabtu kami bermain tenis bersama.'],
    ['田中さんはテニスがとても上手です。', 'Tanaka sangat pandai bermain tenis.'],
    ['わたしはまだ下手です。', 'Saya masih belum mahir.'],
  ] },
  { id: 'wc-n5-7', level: 'N5', topic: 'Akhir pekan', sentences: [
    ['先週の日曜日は休みでした。', 'Minggu lalu hari Minggu saya libur.'],
    ['午前中は部屋をそうじしました。', 'Pagi harinya saya membersihkan kamar.'],
    ['午後は公園で本を読みました。', 'Siang harinya saya membaca buku di taman.'],
    ['夜は家で映画を見ました。', 'Malamnya saya menonton film di rumah.'],
    ['しずかでいい日でした。', 'Hari yang tenang dan menyenangkan.'],
  ] },

  // ---------------------------------------------------------------- N4
  { id: 'wc-n4-1', level: 'N4', topic: 'Belajar bahasa Jepang', sentences: [
    ['わたしは一年前から日本語を勉強しています。', 'Saya sudah belajar bahasa Jepang sejak setahun lalu.'],
    ['はじめはひらがなを覚えるのが大変でした。', 'Awalnya menghafal hiragana itu berat.'],
    ['でも、毎日少しずつ練習したので、今は簡単な本が読めるようになりました。', 'Tetapi karena berlatih sedikit demi sedikit setiap hari, sekarang saya sudah bisa membaca buku sederhana.'],
    ['来年は日本へ旅行に行くつもりです。', 'Tahun depan saya berencana pergi berwisata ke Jepang.'],
    ['日本人と話してみたいです。', 'Saya ingin mencoba berbicara dengan orang Jepang.'],
  ] },
  { id: 'wc-n4-2', level: 'N4', topic: 'Sakit flu', sentences: [
    ['きのうから頭が痛くて、熱があります。', 'Sejak kemarin kepala saya sakit dan saya demam.'],
    ['病院へ行ったら、医者に「かぜですね」と言われました。', 'Saat ke rumah sakit, dokter berkata kepada saya, "Ini flu, ya."'],
    ['薬をもらって、早く寝ることにしました。', 'Saya mendapat obat dan memutuskan untuk tidur lebih awal.'],
    ['あしたは会社を休まなければなりません。', 'Besok saya harus izin tidak masuk kantor.'],
    ['早く元気になりたいです。', 'Saya ingin cepat sehat.'],
  ] },
  { id: 'wc-n4-3', level: 'N4', topic: 'Hadiah ulang tahun', sentences: [
    ['先週、妹の誕生日でした。', 'Minggu lalu adalah hari ulang tahun adik perempuan saya.'],
    ['わたしは妹にかわいいかばんをあげました。', 'Saya memberi adik tas yang lucu.'],
    ['妹はとても喜んで、すぐに使ってくれました。', 'Adik sangat senang dan langsung memakainya.'],
    ['母は妹のためにケーキを作りました。', 'Ibu membuat kue untuk adik.'],
    ['家族みんなで写真をとりました。', 'Kami sekeluarga berfoto bersama.'],
  ] },
  { id: 'wc-n4-4', level: 'N4', topic: 'Kerja paruh waktu', sentences: [
    ['わたしは駅の前のレストランでアルバイトをしています。', 'Saya bekerja paruh waktu di restoran depan stasiun.'],
    ['週に三回、夕方から夜まで働きます。', 'Tiga kali seminggu saya bekerja dari sore sampai malam.'],
    ['仕事は忙しいですが、店長がやさしいので楽しいです。', 'Pekerjaannya sibuk, tetapi karena manajernya baik, menyenangkan.'],
    ['お客さんに「ありがとう」と言われると、うれしくなります。', 'Kalau pelanggan berterima kasih, saya jadi senang.'],
    ['ためたお金で新しいカメラを買おうと思っています。', 'Saya berpikir untuk membeli kamera baru dengan uang yang saya tabung.'],
  ] },
  { id: 'wc-n4-5', level: 'N4', topic: 'Pindah rumah', sentences: [
    ['先月、新しいアパートに引っ越しました。', 'Bulan lalu saya pindah ke apartemen baru.'],
    ['前のアパートより駅に近いので、とても便利です。', 'Karena lebih dekat ke stasiun daripada apartemen sebelumnya, sangat praktis.'],
    ['近くにスーパーや病院もあります。', 'Di dekatnya juga ada supermarket dan rumah sakit.'],
    ['ただ、部屋が少しせまいのが残念です。', 'Hanya saja, sayang kamarnya agak sempit.'],
    ['今度、友だちを呼んでパーティーをしようと思います。', 'Lain kali saya ingin mengundang teman dan mengadakan pesta.'],
  ] },
  { id: 'wc-n4-6', level: 'N4', topic: 'Barang tertinggal', sentences: [
    ['けさ、電車の中にかさを忘れてしまいました。', 'Tadi pagi saya ketinggalan payung di dalam kereta.'],
    ['駅員さんに聞いたら、終点の駅に届いているそうです。', 'Saat saya tanya petugas stasiun, katanya payung itu sudah diantar ke stasiun terakhir.'],
    ['仕事が終わってから、取りに行くつもりです。', 'Saya berencana mengambilnya setelah pekerjaan selesai.'],
    ['これからは降りる前によく確認しようと思います。', 'Mulai sekarang saya akan memeriksa baik-baik sebelum turun.'],
  ] },
  { id: 'wc-n4-7', level: 'N4', topic: 'Festival musim panas', sentences: [
    ['夏になると、町で大きなお祭りがあります。', 'Setiap musim panas, di kota ada festival besar.'],
    ['ゆかたを着て、友だちと出かけました。', 'Saya mengenakan yukata dan pergi bersama teman.'],
    ['道の両側にたくさんの店が並んでいて、にぎやかでした。', 'Di kedua sisi jalan berjejer banyak kios, suasananya ramai.'],
    ['夜には花火が上がって、とてもきれいでした。', 'Malam harinya kembang api diluncurkan, sangat indah.'],
    ['来年もまた行きたいと思いました。', 'Saya berpikir ingin pergi lagi tahun depan.'],
  ] },

  // ---------------------------------------------------------------- N3
  { id: 'wc-n3-1', level: 'N3', topic: 'Kebiasaan membaca', sentences: [
    ['最近、寝る前に本を読む習慣をつけるようにしています。', 'Akhir-akhir ini saya berusaha membiasakan diri membaca buku sebelum tidur.'],
    ['以前はスマホばかり見ていたせいで、なかなか眠れませんでした。', 'Dulu karena terus-terusan melihat ponsel, saya sulit tidur.'],
    ['本を読むようになってから、自然に眠くなるようになりました。', 'Sejak mulai membaca buku, saya jadi mengantuk dengan sendirinya.'],
    ['一日十ページだけでも、続けることが大切だと思います。', 'Menurut saya, meski hanya sepuluh halaman sehari, yang penting adalah konsisten.'],
  ] },
  { id: 'wc-n3-2', level: 'N3', topic: 'Kereta yang terlambat', sentences: [
    ['今朝は大雪のため、電車が一時間も遅れました。', 'Tadi pagi karena salju lebat, kereta terlambat sampai satu jam.'],
    ['大事な会議があったので、会社に電話して事情を説明しました。', 'Karena ada rapat penting, saya menelepon kantor dan menjelaskan keadaannya.'],
    ['上司は「気をつけて来てください」と言ってくれました。', 'Atasan saya berkata, "Hati-hati di jalan ya."'],
    ['こういう日こそ、早めに家を出るべきだったと反省しています。', 'Saya menyesal; justru di hari seperti ini seharusnya saya berangkat lebih awal.'],
  ] },
  { id: 'wc-n3-3', level: 'N3', topic: 'Memasak sendiri', sentences: [
    ['一人暮らしを始めてから、自分で料理を作るようになりました。', 'Sejak mulai tinggal sendiri, saya jadi memasak sendiri.'],
    ['最初は失敗ばかりでしたが、だんだん上手になってきました。', 'Awalnya selalu gagal, tetapi lama-lama saya semakin mahir.'],
    ['外食に比べると、お金もかからないし、体にもいいです。', 'Dibandingkan makan di luar, lebih hemat dan juga lebih sehat.'],
    ['今では友だちに料理を教えてほしいと頼まれることもあります。', 'Sekarang kadang-kadang teman meminta saya mengajari mereka memasak.'],
  ] },
  { id: 'wc-n3-4', level: 'N3', topic: 'Sampah plastik', sentences: [
    ['最近、プラスチックのごみを減らそうとする人が増えています。', 'Akhir-akhir ini semakin banyak orang yang berusaha mengurangi sampah plastik.'],
    ['わたしも買い物に行くときは、必ず自分の袋を持っていくことにしています。', 'Saya juga selalu membawa tas sendiri setiap kali pergi berbelanja.'],
    ['小さなことでも、みんながやれば大きな効果があるはずです。', 'Meski hal kecil, kalau semua orang melakukannya, pasti dampaknya besar.'],
    ['まずは自分にできることから始めたいと思います。', 'Saya ingin memulai dari hal yang bisa saya lakukan sendiri.'],
  ] },
  { id: 'wc-n3-5', level: 'N3', topic: 'Wawancara kerja', sentences: [
    ['来週、ずっと行きたかった会社の面接を受けることになりました。', 'Minggu depan saya akan mengikuti wawancara di perusahaan yang sudah lama saya inginkan.'],
    ['緊張しないように、毎晩友だちに練習を手伝ってもらっています。', 'Supaya tidak gugup, setiap malam saya dibantu teman berlatih.'],
    ['自分の長所をうまく伝えられるかどうか心配です。', 'Saya khawatir apakah bisa menyampaikan kelebihan diri dengan baik.'],
    ['結果がどうであっても、全力を出すつもりです。', 'Apa pun hasilnya, saya berniat mengerahkan seluruh kemampuan.'],
  ] },
  { id: 'wc-n3-6', level: 'N3', topic: 'Kenangan masa kecil', sentences: [
    ['子どものころ、夏休みになると祖父の家に泊まりに行ったものです。', 'Waktu kecil, setiap liburan musim panas saya biasa menginap di rumah kakek.'],
    ['祖父はいつも川へ魚つりに連れていってくれました。', 'Kakek selalu mengajak saya memancing ikan di sungai.'],
    ['あのころの思い出は、今でもはっきり覚えています。', 'Kenangan masa itu masih saya ingat dengan jelas sampai sekarang.'],
    ['大人になった今、もう一度あの川を見に行きたくなります。', 'Sekarang setelah dewasa, saya jadi ingin melihat sungai itu sekali lagi.'],
  ] },
  { id: 'wc-n3-7', level: 'N3', topic: 'Menabung', sentences: [
    ['海外旅行に行くために、去年から貯金を始めました。', 'Untuk pergi berwisata ke luar negeri, saya mulai menabung sejak tahun lalu.'],
    ['毎月、給料の一割を別の口座に入れるようにしています。', 'Setiap bulan saya berusaha menyisihkan sepuluh persen gaji ke rekening terpisah.'],
    ['欲しいものがあっても、本当に必要かどうかよく考えてから買います。', 'Meski ada barang yang saya inginkan, saya memikirkan baik-baik apakah benar-benar perlu sebelum membelinya.'],
    ['おかげで、目標の金額まであと少しです。', 'Berkat itu, tinggal sedikit lagi sampai jumlah target.'],
  ] },

  // ---------------------------------------------------------------- N2
  { id: 'wc-n2-1', level: 'N2', topic: 'Kerja jarak jauh', sentences: [
    ['在宅勤務が広まるにつれて、働き方に対する考え方も変わりつつある。', 'Seiring meluasnya kerja dari rumah, cara pandang terhadap cara bekerja pun sedang berubah.'],
    ['通勤時間がなくなった分、家族と過ごす時間が増えたという人も少なくない。', 'Tidak sedikit orang yang mengatakan waktu bersama keluarga bertambah karena tidak ada lagi waktu perjalanan ke kantor.'],
    ['その一方で、仕事と私生活の区別がつきにくいという声もある。', 'Di sisi lain, ada juga yang mengatakan sulit memisahkan pekerjaan dan kehidupan pribadi.'],
    ['自分に合ったリズムを見つけることが、何よりも重要だと言えるだろう。', 'Bisa dikatakan, menemukan ritme yang cocok untuk diri sendiri adalah hal yang paling penting.'],
  ] },
  { id: 'wc-n2-2', level: 'N2', topic: 'Toko lama di kota', sentences: [
    ['駅前の古い本屋が、今月末で閉店することになった。', 'Toko buku tua di depan stasiun akan tutup pada akhir bulan ini.'],
    ['ネットで本を買う人が増えたことを考えれば、無理もない。', 'Kalau mengingat semakin banyak orang membeli buku lewat internet, wajar saja.'],
    ['とはいえ、学生時代から通っていた店がなくなるのは寂しい限りだ。', 'Meski begitu, sungguh menyedihkan toko yang saya datangi sejak masa sekolah akan hilang.'],
    ['最後にもう一度、ゆっくり棚を眺めに行こうと思う。', 'Saya ingin pergi sekali lagi untuk terakhir kalinya dan memandangi raknya dengan santai.'],
  ] },
  { id: 'wc-n2-3', level: 'N2', topic: 'Tidur dan kesehatan', sentences: [
    ['睡眠不足は、集中力の低下だけでなく、さまざまな病気の原因にもなりかねない。', 'Kurang tidur tidak hanya menurunkan konsentrasi, tetapi juga bisa menjadi penyebab berbagai penyakit.'],
    ['忙しいからといって、睡眠時間を削るのは決して得策ではない。', 'Meskipun sibuk, mengurangi jam tidur sama sekali bukan langkah yang bijak.'],
    ['毎日同じ時間に寝起きするだけでも、体の調子はずいぶん変わるものだ。', 'Hanya dengan tidur dan bangun di jam yang sama setiap hari pun, kondisi tubuh bisa berubah cukup banyak.'],
    ['まずは一週間、試してみてはどうだろうか。', 'Bagaimana kalau dicoba dulu selama seminggu?'],
  ] },
  { id: 'wc-n2-4', level: 'N2', topic: 'Belajar dari kegagalan', sentences: [
    ['失敗を恐れるあまり、新しいことに挑戦できない人は多い。', 'Banyak orang yang tidak bisa mencoba hal baru karena terlalu takut gagal.'],
    ['しかし、失敗を通して得られる経験は、成功からは学べないものだ。', 'Namun, pengalaman yang didapat melalui kegagalan adalah hal yang tidak bisa dipelajari dari keberhasilan.'],
    ['大切なのは、失敗した後にその原因をきちんと振り返ることである。', 'Yang penting adalah meninjau penyebabnya dengan saksama setelah gagal.'],
    ['そうすれば、次の挑戦に必ず生かせるはずだ。', 'Dengan begitu, pasti bisa dimanfaatkan untuk tantangan berikutnya.'],
  ] },
  { id: 'wc-n2-5', level: 'N2', topic: 'Pariwisata daerah', sentences: [
    ['近年、外国人観光客の増加に伴い、地方の小さな町にも注目が集まっている。', 'Beberapa tahun terakhir, seiring bertambahnya wisatawan asing, kota-kota kecil di daerah pun mulai mendapat perhatian.'],
    ['ある町では、空き家を宿泊施設として活用する取り組みが始まった。', 'Di sebuah kota, dimulai upaya memanfaatkan rumah kosong sebagai tempat menginap.'],
    ['地元の人々にとっても、地域を見直すきっかけになったようだ。', 'Bagi warga setempat pun, tampaknya ini menjadi kesempatan untuk melihat kembali daerah mereka.'],
    ['観光と住民の生活をいかに両立させるかが、今後の課題である。', 'Bagaimana menyeimbangkan pariwisata dan kehidupan warga adalah tantangan ke depan.'],
  ] },
  { id: 'wc-n2-6', level: 'N2', topic: 'Membaca koran', sentences: [
    ['新聞を読む若者が減っていると言われて久しい。', 'Sudah lama dikatakan bahwa jumlah anak muda yang membaca koran berkurang.'],
    ['確かに、ニュースならスマホで手軽に見ることができる。', 'Memang, kalau sekadar berita, bisa dilihat dengan mudah lewat ponsel.'],
    ['だが、紙面を眺めていると、自分では選ばない記事に偶然出会うことがある。', 'Tetapi saat memandangi halaman koran, kadang kita kebetulan bertemu artikel yang tidak akan kita pilih sendiri.'],
    ['そうした出会いこそ、視野を広げてくれるのではないだろうか。', 'Bukankah justru pertemuan seperti itulah yang memperluas wawasan kita?'],
  ] },
  { id: 'wc-n2-7', level: 'N2', topic: 'Hobi baru', sentences: [
    ['三十歳を過ぎてから、ピアノを習い始めた。', 'Setelah lewat usia tiga puluh, saya mulai belajar piano.'],
    ['子どものころに習っておけばよかったと思わないでもない。', 'Bukannya saya tidak berpikir seharusnya dulu belajar sejak kecil.'],
    ['それでも、少しずつ弾ける曲が増えていく喜びは格別だ。', 'Meski begitu, kegembiraan saat lagu yang bisa dimainkan bertambah sedikit demi sedikit itu luar biasa.'],
    ['何かを始めるのに遅すぎるということはないのだと実感している。', 'Saya benar-benar merasakan bahwa tidak ada kata terlambat untuk memulai sesuatu.'],
  ] },

  // ---------------------------------------------------------------- N1
  { id: 'wc-n1-1', level: 'N1', topic: 'Bahasa dan cara berpikir', sentences: [
    ['言語は単なる伝達の道具にとどまらず、ものの見方そのものを形作っている。', 'Bahasa tidak berhenti sebagai alat komunikasi semata, tetapi membentuk cara pandang itu sendiri.'],
    ['外国語を学ぶことは、とりもなおさず別の世界観に触れることにほかならない。', 'Mempelajari bahasa asing tidak lain berarti bersentuhan dengan pandangan dunia yang lain.'],
    ['母語では当たり前だった区別が、他の言語では存在しないことも珍しくない。', 'Tidak jarang pembedaan yang lumrah dalam bahasa ibu ternyata tidak ada dalam bahasa lain.'],
    ['その違いに戸惑うことこそが、学びの醍醐味と言えよう。', 'Justru kebingungan menghadapi perbedaan itulah yang bisa disebut sebagai inti kenikmatan belajar.'],
  ] },
  { id: 'wc-n1-2', level: 'N1', topic: 'Teknologi dan kesepian', sentences: [
    ['いつでも誰とでもつながれる時代になったにもかかわらず、孤独を訴える人は後を絶たない。', 'Meskipun kini zaman ketika kita bisa terhubung dengan siapa saja kapan saja, orang yang mengeluhkan kesepian tidak ada habisnya.'],
    ['画面越しのやり取りが増えれば増えるほど、対面の重みが増すのは皮肉なことだ。', 'Ironis, semakin banyak interaksi lewat layar, semakin berat arti bertatap muka.'],
    ['便利さを享受しつつも、人と直接向き合う時間を意識的に設ける必要があるのではないか。', 'Bukankah sambil menikmati kemudahan, kita perlu sengaja menyediakan waktu untuk berhadapan langsung dengan orang lain?'],
  ] },
  { id: 'wc-n1-3', level: 'N1', topic: 'Kerajinan tradisional', sentences: [
    ['後継者不足に悩む伝統工芸の現場では、存続そのものが危ぶまれている。', 'Di dunia kerajinan tradisional yang kekurangan penerus, kelangsungannya sendiri sedang dikhawatirkan.'],
    ['ある職人は、技術を守るためには、時代に合わせて変化することもいとわないと語る。', 'Seorang perajin mengatakan bahwa demi menjaga keterampilan, ia tidak segan untuk berubah mengikuti zaman.'],
    ['伝統を守ることと革新を受け入れることは、必ずしも相反するものではないのだ。', 'Menjaga tradisi dan menerima inovasi belum tentu saling bertentangan.'],
  ] },
  { id: 'wc-n1-4', level: 'N1', topic: 'Waktu luang', sentences: [
    ['予定を詰め込むことが充実の証であるかのような風潮には、いささか疑問を覚える。', 'Saya agak meragukan anggapan yang seolah-olah menganggap jadwal padat sebagai bukti hidup yang bermakna.'],
    ['何もしない時間があってこそ、考えが熟し、新たな発想が生まれるものだ。', 'Justru karena ada waktu untuk tidak melakukan apa-apa, pikiran menjadi matang dan gagasan baru lahir.'],
    ['余白を無駄と切り捨てるのは、あまりにも早計と言わざるを得ない。', 'Mau tidak mau harus dikatakan bahwa membuang ruang kosong sebagai hal sia-sia itu terlalu gegabah.'],
  ] },
  { id: 'wc-n1-5', level: 'N1', topic: 'Kebijakan lingkungan', sentences: [
    ['環境問題をめぐる議論は、往々にして理想と現実の板挟みになりがちである。', 'Perdebatan seputar masalah lingkungan sering kali cenderung terjepit antara ideal dan kenyataan.'],
    ['規制を強化すれば企業の負担が増し、緩めれば環境破壊に歯止めがかからない。', 'Jika regulasi diperketat, beban perusahaan bertambah; jika dilonggarkan, kerusakan lingkungan tak terbendung.'],
    ['いずれにせよ、将来世代への責任を抜きにしては語れない問題であることに変わりはない。', 'Bagaimanapun, ini tetap masalah yang tidak bisa dibicarakan tanpa memperhitungkan tanggung jawab kepada generasi mendatang.'],
  ] },
  { id: 'wc-n1-6', level: 'N1', topic: 'Membaca karya klasik', sentences: [
    ['古典は難解だからと敬遠されがちだが、読み進めるうちに意外な親しみを覚えることがある。', 'Karya klasik cenderung dihindari karena sulit dipahami, tetapi seiring membacanya kadang kita merasakan keakraban yang tak terduga.'],
    ['千年も前の人々が、今の私たちと同じように恋に悩み、季節の移ろいに心を動かされていたのだ。', 'Orang-orang seribu tahun lalu pun, sama seperti kita sekarang, galau karena cinta dan tersentuh oleh pergantian musim.'],
    ['時代を隔ててなお響き合うものがあるからこそ、古典は読み継がれてきたに違いない。', 'Pasti karena ada hal yang tetap beresonansi meski terpisah zaman, karya klasik terus dibaca dari generasi ke generasi.'],
  ] },
  { id: 'wc-n1-7', level: 'N1', topic: 'Kepemimpinan', sentences: [
    ['優れた指導者とは、自ら先頭に立つのみならず、周囲の力を引き出せる人のことだろう。', 'Pemimpin yang unggul mungkin adalah orang yang tidak hanya berdiri di depan, tetapi juga mampu mengeluarkan potensi orang-orang di sekitarnya.'],
    ['部下の意見に耳を傾けることは、決して権威を損なうものではない。', 'Mendengarkan pendapat bawahan sama sekali tidak merusak wibawa.'],
    ['むしろ、それによって信頼が築かれ、組織全体が強くなるのである。', 'Justru dengan itulah kepercayaan terbangun dan seluruh organisasi menjadi kuat.'],
  ] },
];
