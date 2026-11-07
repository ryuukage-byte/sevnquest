import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  Mailbox, Mail, MailOpen, Send, PenLine, Archive, ArchiveRestore, Reply, Landmark, X, ArrowLeft,
  RefreshCw, EyeOff, UserRound, Copy, Check,
} from 'lucide-react';
import {
  ADMIN_ADDRESS,
  ADMIN_NAME,
  ADMIN_OFFICE,
  AdminBox,
  AdminLetter,
  CATEGORIES,
  EMPTY_LETTER,
  LETTER_LIMITS,
  Letter,
  LetterCategory,
  LetterDraft,
  PlayerBox,
  STATIONERY,
  Stationery,
  adminBox,
  categoryLabel,
  playerBox,
  postmark,
  replySubject,
  signatureOf,
  stationeryStyle,
  validateLetter,
} from '../../lib/mailCore';
import {
  adminListLetters,
  adminReplyLetter,
  archiveLetter,
  currentUserId,
  listMyLetters,
  markLetterRead,
  sendLetter,
  useMailStatus,
} from '../../lib/mail';
import { playSound } from '../../utils/audio';
import { LetterPaper } from './LetterPaper';
import { BoxVariant, PostScene, TakeScene } from './MailScenes';

/** Surat muncul halus setelah diambil dari kotak pos. */
const REVEAL = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export type PostOfficeView = PlayerBox | 'compose' | 'admin';

const INPUT =
  'w-full bg-surface-inset border border-border-subtle focus:border-border-primary rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors shadow-inner';
const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-text-secondary';
const CHIP_ON = 'bg-surface-elevated border-gold/60 text-text-primary';
const CHIP_OFF = 'bg-surface-inset border-border-subtle text-text-muted';

/** Draf surat bertahan selama aplikasi terbuka (tutup/buka kotak pos tidak menghapusnya). */
let savedDraft: LetterDraft = EMPTY_LETTER;

const ADMIN_BOXES: { value: AdminBox; label: string }[] = [
  { value: 'unread', label: 'Belum dibaca' },
  { value: 'unanswered', label: 'Belum dibalas' },
  { value: 'all', label: 'Semua' },
  { value: 'archive', label: 'Arsip' },
];

// --------------------------- Amplop (item daftar) ---------------------------

function Envelope({
  sealed, who, subject, date, category, stationery, badge, onOpen,
}: {
  sealed: boolean;
  who: string;
  subject: string;
  date: string;
  category: LetterCategory;
  stationery: Stationery;
  badge?: React.ReactNode;
  onOpen: () => void;
}) {
  const s = stationeryStyle(stationery);
  const Icon = sealed ? Mail : MailOpen;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors hover:bg-surface-elevated/50 ${
        sealed ? 'bg-surface-elevated/40 border-gold/50' : 'bg-surface-inset border-border-subtle'
      }`}
    >
      <span
        className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border"
        style={{ background: s.paper, color: s.ink, borderColor: s.rule }}
        aria-hidden="true"
      >
        <Icon className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className={`font-bold ${sealed ? 'text-text-primary' : 'text-text-secondary'}`}>{who}</span>
          <span className="text-text-muted">· {categoryLabel(category)}</span>
          {badge}
        </span>
        <span className={`block text-sm truncate ${sealed ? 'font-black text-text-primary' : 'font-bold text-text-secondary'}`}>
          {subject}
        </span>
      </span>
      <span className="text-[10px] text-text-muted shrink-0 self-start mt-0.5">{postmark(date)}</span>
    </button>
  );
}

function Pill({ tone, children }: { tone: 'wine' | 'green' | 'muted' | 'gold'; children: React.ReactNode }) {
  const cls = {
    wine: 'bg-wine-accent/15 text-wine-accent',
    green: 'bg-emerald-500/15 text-emerald-400',
    muted: 'bg-surface-inset text-text-muted border border-border-subtle',
    gold: 'bg-gold/15 text-gold',
  }[tone];
  return <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${cls}`}>{children}</span>;
}

// --------------------------- Menulis surat ---------------------------

interface ComposeProps {
  mode: 'player' | 'adminReply';
  draft: LetterDraft;
  onDraft: (d: LetterDraft) => void;
  toName: string;
  toAddress: string;
  note?: string | null;
  playerName: string;
  address: string | null;
  busy: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel?: () => void;
}

function ComposeLetter({
  mode, draft, onDraft, toName, toAddress, note, playerName, address, busy, error, onSubmit, onCancel,
}: ComposeProps) {
  const set = <K extends keyof LetterDraft>(k: K, v: LetterDraft[K]) => onDraft({ ...draft, [k]: v });
  const s = stationeryStyle(draft.stationery);
  const signature = mode === 'adminReply' ? ADMIN_NAME : signatureOf({ isAnonymous: draft.anonymous, senderName: playerName || null });
  const signatureAddress = mode === 'adminReply'
    ? `${ADMIN_OFFICE} · ${ADMIN_ADDRESS}`
    : draft.anonymous ? null : address;

  return (
    <div className="space-y-4">
      {mode === 'player' && (
        <div className="rounded-2xl bg-surface-inset border border-border-subtle p-3 flex items-center gap-3">
          <span className="w-10 h-10 ui-icon-box rounded-xl text-indigo shrink-0"><Landmark className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className={LABEL}>Kepada</p>
            <p className="text-sm font-bold text-text-primary">{ADMIN_NAME} · {ADMIN_OFFICE}</p>
            <p className="text-[10px] text-text-muted">Alamat {ADMIN_ADDRESS}. Untuk saat ini surat hanya bisa dikirim ke admin.</p>
          </div>
        </div>
      )}

      {mode === 'player' && (
        <div className="space-y-1.5">
          <span className={LABEL}>Jenis surat</span>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => set('category', c.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${draft.category === c.value ? CHIP_ON : CHIP_OFF}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className={LABEL}>Perihal</span>
        <input
          value={draft.subject}
          onChange={e => set('subject', e.target.value)}
          maxLength={LETTER_LIMITS.subject}
          placeholder={mode === 'player' ? 'mis. Progres hilang setelah ganti HP' : 'Perihal balasan'}
          className={INPUT}
        />
      </label>

      <div className="space-y-1.5">
        <span className={LABEL}>Kertas surat</span>
        <div className="flex flex-wrap gap-2">
          {STATIONERY.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => set('stationery', p.value)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${draft.stationery === p.value ? CHIP_ON : CHIP_OFF}`}
            >
              <span className="w-5 h-5 rounded-md border" style={{ background: p.paper, borderColor: p.rule }} aria-hidden="true" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'player' && (
        <div className="space-y-1.5">
          <span className={LABEL}>Identitas pengirim</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { anon: false, Icon: UserRound, title: 'Tampilkan nama & alamat', hint: `${playerName || 'Pemain SevnQuest'}${address ? ` · ${address}` : ''}` },
              { anon: true, Icon: EyeOff, title: 'Kirim sebagai anonim', hint: 'Admin tidak tahu siapa pengirimnya. Balasan tetap sampai ke kotak posmu.' },
            ].map(o => (
              <button
                key={String(o.anon)}
                type="button"
                onClick={() => set('anonymous', o.anon)}
                aria-pressed={draft.anonymous === o.anon}
                className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-colors ${draft.anonymous === o.anon ? CHIP_ON : CHIP_OFF}`}
              >
                <o.Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold">{o.title}</span>
                  <span className="block text-[10px] text-text-muted leading-snug break-words">{o.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <LetterPaper
        stationery={draft.stationery}
        toName={toName}
        toAddress={toAddress}
        subject={draft.subject}
        category={draft.category}
        signature={signature}
        signatureAddress={signatureAddress}
        note={note}
      >
        <textarea
          value={draft.body}
          onChange={e => set('body', e.target.value)}
          maxLength={LETTER_LIMITS.body}
          rows={9}
          aria-label="Isi surat"
          placeholder={mode === 'player'
            ? 'Tulis suratmu di sini. Untuk laporan bug: apa yang kamu lakukan, apa yang terjadi, dan di perangkat apa.'
            : 'Tulis balasan untuk pengirim surat ini.'}
          className="w-full bg-transparent outline-none resize-y leading-7 text-[15px] placeholder:opacity-60"
          style={{ color: s.ink }}
        />
      </LetterPaper>

      {error && <p className="text-xs text-wine-accent">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="btn-physical-secondary px-4 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 text-indigo disabled:opacity-50"
        >
          <Send className="w-4 h-4" /> {busy ? 'Memposkan…' : mode === 'player' ? 'Poskan Surat' : 'Kirim Balasan'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-pill text-xs gap-1.5">
            <X className="w-3.5 h-3.5" /> Batal
          </button>
        )}
        <span className="text-[10px] text-text-muted ml-auto">{draft.body.length}/{LETTER_LIMITS.body}</span>
      </div>
    </div>
  );
}

// --------------------------- Kantor Pos (modal) ---------------------------

interface PostOfficeProps {
  initialView: PostOfficeView;
  playerName: string;
  soundEnabled?: boolean;
  onClose: () => void;
}

export const PostOffice: React.FC<PostOfficeProps> = ({ initialView, playerName, soundEnabled, onClose }) => {
  const status = useMailStatus();
  const [view, setView] = useState<PostOfficeView>(initialView);
  const [myId, setMyId] = useState<string | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [adminLetters, setAdminLetters] = useState<AdminLetter[]>([]);
  const [adminFilter, setAdminFilter] = useState<AdminBox>('unread');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLetter, setOpenLetter] = useState<Letter | null>(null);
  const [openAdmin, setOpenAdmin] = useState<AdminLetter | null>(null);
  const [replying, setReplying] = useState(false);
  const [draft, setDraftState] = useState<LetterDraft>(savedDraft);
  const [replyDraft, setReplyDraft] = useState<LetterDraft>(EMPTY_LETTER);
  const [busy, setBusy] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Animasi memposkan yang sedang berjalan. */
  const [posting, setPosting] = useState<{ stationery: Stationery; result: Promise<boolean>; onDone: (ok: boolean) => void } | null>(null);
  /** Animasi mengambil surat dari kotak pos yang sedang berjalan. */
  const [taking, setTaking] = useState<{ stationery: Stationery; variant: BoxVariant; open: () => void } | null>(null);

  const setDraft = (d: LetterDraft) => {
    savedDraft = d;
    setDraftState(d);
    setComposeError(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [uid, mine] = await Promise.all([currentUserId(), listMyLetters()]);
    setMyId(uid);
    if (mine.ok) {
      setLetters(mine.data);
      setError(null);
    } else setError(mine.error);
    if (status.isAdmin) {
      const adm = await adminListLetters();
      if (adm.ok) setAdminLetters(adm.data);
      else setError(adm.error);
    }
    setLoading(false);
  }, [status.isAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const me = myId ?? '';
  const inbox = useMemo(() => playerBox(letters, me, 'inbox'), [letters, me]);
  const sent = useMemo(() => playerBox(letters, me, 'sent'), [letters, me]);
  const archived = useMemo(() => playerBox(letters, me, 'archive'), [letters, me]);
  const adminShown = useMemo(() => adminBox(adminLetters, adminFilter), [adminLetters, adminFilter]);
  const inboxUnread = inbox.filter(l => !l.readAt).length;
  const adminUnread = adminLetters.filter(l => !l.archived && !l.readAt).length;

  const goto = (v: PostOfficeView) => {
    if (posting) return; // jangan pindah laci saat surat sedang diposkan
    playSound('click', soundEnabled);
    setTaking(null);
    setView(v);
    setOpenLetter(null);
    setOpenAdmin(null);
    setReplying(false);
    setPosted(false);
  };

  const readLetter = async (l: Letter) => {
    playSound('open_modal', soundEnabled);
    if (l.recipientId === me) {
      // Surat masuk diambil dari kotak pos dulu.
      setTaking({ stationery: l.stationery, variant: 'indigo', open: () => setOpenLetter(l) });
    } else {
      setOpenLetter(l);
    }
    if (l.recipientId === me && !l.readAt) {
      const now = new Date().toISOString();
      setLetters(list => list.map(x => (x.id === l.id ? { ...x, readAt: now } : x)));
      await markLetterRead(l.id);
    }
  };

  const readAdmin = async (l: AdminLetter) => {
    playSound('open_modal', soundEnabled);
    setReplying(false);
    setTaking({ stationery: l.stationery, variant: 'red', open: () => setOpenAdmin(l) });
    if (!l.readAt) {
      const now = new Date().toISOString();
      setAdminLetters(list => list.map(x => (x.id === l.id ? { ...x, readAt: now } : x)));
      await markLetterRead(l.id);
    }
  };

  const toggleArchive = async (id: string, value: boolean) => {
    setBusy(true);
    const res = await archiveLetter(id, value);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpenLetter(null);
    setOpenAdmin(null);
    await load();
  };

  const post = async () => {
    const v = validateLetter(draft);
    if (v) {
      setComposeError(v);
      return;
    }
    setBusy(true);
    setComposeError(null);
    const request = sendLetter(draft, playerName);
    let failure: string | null = null;
    const result = request.then(res => {
      if (!res.ok) failure = res.error;
      return res.ok;
    });
    setPosting({
      stationery: draft.stationery,
      result,
      onDone: ok => {
        setPosting(null);
        setBusy(false);
        if (!ok) {
          setComposeError(failure ?? 'Surat gagal diposkan. Coba lagi.');
          return;
        }
        playSound('correct', soundEnabled);
        setDraft(EMPTY_LETTER);
        setPosted(true);
        void load();
      },
    });
  };

  const sendReply = async () => {
    if (!openAdmin) return;
    const v = validateLetter(replyDraft);
    if (v) {
      setComposeError(v);
      return;
    }
    setBusy(true);
    setComposeError(null);
    let failure: string | null = null;
    const result = adminReplyLetter(openAdmin.id, replyDraft.subject, replyDraft.body, replyDraft.stationery).then(res => {
      if (!res.ok) failure = res.error;
      return res.ok;
    });
    setPosting({
      stationery: replyDraft.stationery,
      result,
      onDone: ok => {
        setPosting(null);
        setBusy(false);
        if (!ok) {
          setComposeError(failure ?? 'Balasan gagal diposkan. Coba lagi.');
          return;
        }
        playSound('correct', soundEnabled);
        setReplying(false);
        setOpenAdmin(null);
        void load();
      },
    });
  };

  const copyAddress = async () => {
    if (!status.address) return;
    try {
      await navigator.clipboard.writeText(status.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard diblokir */
    }
  };

  const subjectOf = (id: string | null) => (id ? letters.find(l => l.id === id)?.subject ?? null : null);
  const replyFor = (id: string) => letters.find(l => l.replyTo === id && l.recipientId === me) ?? null;

  const tabs: { value: PostOfficeView; label: string; Icon: typeof Mail; count?: number }[] = [
    ...(status.isAdmin ? [{ value: 'admin' as const, label: ADMIN_OFFICE, Icon: Landmark, count: adminUnread }] : []),
    { value: 'inbox', label: 'Surat Masuk', Icon: Mail, count: inboxUnread },
    { value: 'sent', label: 'Terkirim', Icon: Send },
    { value: 'archive', label: 'Arsip', Icon: Archive },
    { value: 'compose', label: 'Tulis Surat', Icon: PenLine },
  ];

  // ----- isi tiap tampilan -----

  const renderPlayerLetter = (l: Letter) => {
    const incoming = l.recipientId === me;
    const isArchived = incoming ? l.archivedByRecipient : l.archivedBySender;
    const original = incoming ? subjectOf(l.replyTo) : null;
    const reply = incoming ? null : replyFor(l.id);
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setOpenLetter(null)} className="btn btn-pill text-xs gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali
        </button>
        <motion.div {...REVEAL}>
        <LetterPaper
          stationery={l.stationery}
          date={l.sentAt}
          toName={incoming ? playerName || 'Pemain SevnQuest' : ADMIN_NAME}
          toAddress={incoming ? status.address ?? '' : `${ADMIN_OFFICE} · ${ADMIN_ADDRESS}`}
          subject={l.subject}
          category={l.category}
          body={l.body}
          signature={signatureOf(l)}
          signatureAddress={l.fromAdmin ? `${ADMIN_OFFICE} · ${ADMIN_ADDRESS}` : l.senderAddress}
          note={original ? `Membalas suratmu: "${original}"` : null}
        />
        </motion.div>
        {!incoming && (
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-text-secondary">
            {l.isAnonymous && <Pill tone="muted">Dikirim anonim</Pill>}
            {l.repliedAt ? <Pill tone="green">Sudah dibalas</Pill> : l.readAt ? <Pill tone="gold">Sudah dibaca admin</Pill> : <Pill tone="muted">Dalam perjalanan</Pill>}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {reply && (
            <button type="button" onClick={() => void readLetter(reply)} className="btn btn-pill text-xs gap-1.5 text-indigo">
              <MailOpen className="w-3.5 h-3.5" /> Baca balasan admin
            </button>
          )}
          {incoming && (
            <button
              type="button"
              onClick={() => {
                setDraft({ ...draft, subject: replySubject(l.subject), category: l.category });
                goto('compose');
              }}
              className="btn btn-pill text-xs gap-1.5 text-indigo"
            >
              <Reply className="w-3.5 h-3.5" /> Tulis surat balasan
            </button>
          )}
          <button type="button" onClick={() => void toggleArchive(l.id, !isArchived)} disabled={busy} className="btn btn-pill text-xs gap-1.5">
            {isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            {isArchived ? 'Keluarkan dari arsip' : 'Simpan ke arsip'}
          </button>
        </div>
      </div>
    );
  };

  const renderPlayerBox = (list: Letter[], empty: string) => (
    <div className="space-y-2">
      {list.length === 0 && !loading && (
        <div className="text-center py-10 space-y-2">
          <Mailbox className="w-10 h-10 mx-auto text-text-muted" />
          <p className="text-xs text-text-muted">{empty}</p>
        </div>
      )}
      {list.map(l => {
        const incoming = l.recipientId === me;
        return (
          <Envelope
            key={l.id}
            sealed={incoming && !l.readAt}
            who={incoming ? `Dari ${signatureOf(l)}` : `Kepada ${ADMIN_NAME}`}
            subject={l.subject}
            date={l.sentAt}
            category={l.category}
            stationery={l.stationery}
            badge={
              incoming
                ? !l.readAt && <Pill tone="wine">Baru</Pill>
                : l.repliedAt
                  ? <Pill tone="green">Dibalas</Pill>
                  : l.isAnonymous && <Pill tone="muted">Anonim</Pill>
            }
            onOpen={() => void readLetter(l)}
          />
        );
      })}
    </div>
  );

  const renderAdmin = () => {
    if (openAdmin) {
      const fromName = signatureOf(openAdmin);
      const fromAddr = openAdmin.isAnonymous ? 'Alamat dirahasiakan' : openAdmin.senderAddress ?? '';
      if (replying) {
        return (
          <div className="space-y-3">
            <button type="button" onClick={() => setReplying(false)} className="btn btn-pill text-xs gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke surat
            </button>
            <ComposeLetter
              mode="adminReply"
              draft={replyDraft}
              onDraft={d => {
                setReplyDraft(d);
                setComposeError(null);
              }}
              toName={fromName}
              toAddress={openAdmin.isAnonymous ? 'Alamat dirahasiakan · diantar oleh Kantor Pos' : fromAddr}
              note={`Membalas surat: "${openAdmin.subject}"`}
              playerName={playerName}
              address={status.address}
              busy={busy}
              error={composeError}
              onSubmit={() => void sendReply()}
              onCancel={() => setReplying(false)}
            />
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <button type="button" onClick={() => setOpenAdmin(null)} className="btn btn-pill text-xs gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Kembali
          </button>
          <motion.div {...REVEAL}>
          <LetterPaper
            stationery={openAdmin.stationery}
            date={openAdmin.sentAt}
            toName={ADMIN_NAME}
            toAddress={`${ADMIN_OFFICE} · ${ADMIN_ADDRESS}`}
            subject={openAdmin.subject}
            category={openAdmin.category}
            body={openAdmin.body}
            signature={fromName}
            signatureAddress={openAdmin.isAnonymous ? null : openAdmin.senderAddress}
          />
          </motion.div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {openAdmin.isAnonymous && <Pill tone="muted">Pengirim anonim</Pill>}
            {openAdmin.repliedAt && <Pill tone="green">Sudah dibalas</Pill>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setReplyDraft({ ...EMPTY_LETTER, subject: replySubject(openAdmin.subject), category: openAdmin.category });
                setComposeError(null);
                setReplying(true);
              }}
              className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 text-indigo"
            >
              <Reply className="w-3.5 h-3.5" /> {openAdmin.repliedAt ? 'Kirim balasan lagi' : 'Balas Surat'}
            </button>
            <button type="button" onClick={() => void toggleArchive(openAdmin.id, !openAdmin.archived)} disabled={busy} className="btn btn-pill text-xs gap-1.5">
              {openAdmin.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              {openAdmin.archived ? 'Keluarkan dari arsip' : 'Arsipkan'}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {ADMIN_BOXES.map(b => (
            <button
              key={b.value}
              type="button"
              onClick={() => setAdminFilter(b.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${adminFilter === b.value ? CHIP_ON : CHIP_OFF}`}
            >
              {b.label} ({adminBox(adminLetters, b.value).length})
            </button>
          ))}
        </div>
        {adminShown.length === 0 && !loading && (
          <p className="text-xs text-text-muted text-center py-8">Tidak ada surat di laci ini.</p>
        )}
        <div className="space-y-2">
          {adminShown.map(l => (
            <Envelope
              key={l.id}
              sealed={!l.readAt}
              who={`Dari ${signatureOf(l)}`}
              subject={l.subject}
              date={l.sentAt}
              category={l.category}
              stationery={l.stationery}
              badge={l.repliedAt ? <Pill tone="green">Dibalas</Pill> : !l.readAt ? <Pill tone="wine">Baru</Pill> : <Pill tone="gold">Belum dibalas</Pill>}
              onOpen={() => void readAdmin(l)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderCompose = () => {
    if (posted) {
      return (
        <div className="text-center py-10 space-y-3">
          <Send className="w-10 h-10 mx-auto text-indigo" />
          <p className="text-base font-bold font-heading text-text-primary">Suratmu sudah diposkan</p>
          <p className="text-xs text-text-secondary max-w-xs mx-auto">
            Surat sedang menuju {ADMIN_OFFICE}. Balasan admin akan masuk ke kotak posmu, dan bendera kotak pos akan naik.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button type="button" onClick={() => goto('sent')} className="btn btn-pill text-xs gap-1.5">
              <Send className="w-3.5 h-3.5" /> Lihat surat terkirim
            </button>
            <button type="button" onClick={() => setPosted(false)} className="btn btn-pill text-xs gap-1.5 text-indigo">
              <PenLine className="w-3.5 h-3.5" /> Tulis surat lain
            </button>
          </div>
        </div>
      );
    }
    return (
      <ComposeLetter
        mode="player"
        draft={draft}
        onDraft={setDraft}
        toName={ADMIN_NAME}
        toAddress={`${ADMIN_OFFICE} · ${ADMIN_ADDRESS}`}
        playerName={playerName}
        address={status.address}
        busy={busy}
        error={composeError}
        onSubmit={() => void post()}
      />
    );
  };

  let content: React.ReactNode;
  if (posting) {
    content = <PostScene stationery={posting.stationery} result={posting.result} onDone={posting.onDone} />;
  } else if (taking) {
    content = (
      <TakeScene
        stationery={taking.stationery}
        variant={taking.variant}
        onDone={() => {
          taking.open();
          setTaking(null);
        }}
      />
    );
  } else if (view === 'compose') content = renderCompose();
  else if (view === 'admin') content = renderAdmin();
  else if (openLetter) content = renderPlayerLetter(openLetter);
  else if (view === 'inbox') content = renderPlayerBox(inbox, 'Kotak posmu masih kosong. Balasan admin akan muncul di sini.');
  else if (view === 'sent') content = renderPlayerBox(sent, 'Belum ada surat yang kamu kirim.');
  else content = renderPlayerBox(archived, 'Arsip kosong.');

  return createPortal(
    <div
      className="fixed inset-0 z-[9960] flex items-stretch sm:items-center justify-center sm:p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="Kotak Pos"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-2xl panel panel-stitched !rounded-none sm:!rounded-3xl flex flex-col max-h-[100dvh] sm:max-h-[92dvh] overflow-hidden"
      >
        {/* Kepala: kotak pos + alamat */}
        <div className="p-4 sm:p-5 pb-3 border-b border-border-subtle space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 ui-icon-box rounded-xl text-indigo shrink-0"><Mailbox className="w-6 h-6" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold font-heading text-text-primary">Kotak Pos</h2>
              <button
                type="button"
                onClick={() => void copyAddress()}
                className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary"
                title="Salin alamat"
                disabled={!status.address}
              >
                Alamat: <span className="font-mono font-bold text-gold-soft">{status.address ?? '…'}</span>
                {status.address && (copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />)}
              </button>
            </div>
            <button type="button" onClick={() => void load()} className="btn btn-pill text-xs" aria-label="Muat ulang" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="btn btn-pill text-xs" aria-label="Tutup kotak pos">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" role="tablist">
            {tabs.map(t => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={view === t.value}
                disabled={!!posting}
                onClick={() => goto(t.value)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${view === t.value ? CHIP_ON : CHIP_OFF}`}
              >
                <t.Icon className="w-3.5 h-3.5" />
                {t.label}
                {!!t.count && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-wine-accent text-white text-[9px] font-black leading-4 text-center">
                    {t.count > 9 ? '9+' : t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {error && <p className="text-xs text-wine-accent mb-3">{error}</p>}
          {content}
        </div>
      </div>
    </div>,
    document.body,
  );
};
