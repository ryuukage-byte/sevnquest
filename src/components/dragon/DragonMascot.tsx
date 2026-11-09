import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, Lock, Minus, Send, X } from 'lucide-react';
import { DragonEgg, DragonSprite, type DragonMood } from './DragonSprite';
import { DRAGON_DEFAULT_NAME, DRAGON_TIERS, dragonTierForRank, type DragonTier } from '../../data/dragon/tiers';
import { interpret, STARTER_CHOICES, type DragonAwait, type DragonChoice, type DragonCommand, type ReplyMood } from '../../engine/dragon/intent';
import { loadDragonState, saveDragonState, type DragonState } from '../../state/dragonState';
import { useMailStatus } from '../../lib/mail';
import { useBackButton } from '../../hooks/useBackButton';
import { playSound } from '../../utils/audio';

interface ChatMessage {
  id: number;
  from: 'dragon' | 'user';
  text: string;
  choices?: DragonChoice[];
}

interface DragonMascotProps {
  /** Disembunyikan sementara (mis. selama Recall, tur, atau di dalam dungeon/menara). */
  hidden?: boolean;
  soundEnabled?: boolean;
  /** Dijalankan App: navigasi / membuka fitur. */
  onCommand: (cmd: Exclude<DragonCommand, { type: 'dragon_tiers' }>) => void;
}

const NAME = DRAGON_DEFAULT_NAME;
const REVEAL_MS_PER_CHAR = 14;
const THINK_MS = 550;

/** Posisi jangkar: di atas navigasi bawah (ponsel), pojok kanan bawah (desktop). */
const ANCHOR = 'fixed right-3 md:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6';

function greetingText(): string {
  const h = new Date().getHours();
  const time = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  return `${time}! Aku ${NAME}. Mau belajar apa hari ini? Ketik saja, misalnya "aku mau bikin flashcard".`;
}

export const DragonMascot: React.FC<DragonMascotProps> = ({ hidden, soundEnabled = true, onCommand }) => {
  const mail = useMailStatus();
  const tier = useMemo(() => dragonTierForRank(mail.signedIn ? mail.tierRank : 0), [mail.signedIn, mail.tierRank]);

  const [ds, setDs] = useState<DragonState>(loadDragonState);
  const updateDs = useCallback((patch: Partial<DragonState>) => {
    setDs(prev => {
      const next = { ...prev, ...patch };
      saveDragonState(next);
      return next;
    });
  }, []);
  const hatched = Boolean(ds.hatchedAt);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'tiers'>('chat');
  const [hatchOpen, setHatchOpen] = useState(false);
  const [evolution, setEvolution] = useState<{ from: DragonTier; to: DragonTier } | null>(null);

  const [mood, setMood] = useState<DragonMood>(hatched ? 'greeting' : 'idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [awaiting, setAwaiting] = useState<DragonAwait | undefined>();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ id: number; len: number } | null>(null);
  const [pendingMood, setPendingMood] = useState<ReplyMood | null>(null);

  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Sapaan singkat saat aplikasi dibuka (naga sudah menetas).
  useEffect(() => {
    if (hatched) later(() => setMood(m => (m === 'greeting' ? 'idle' : m)), 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Evolusi: tier naik melebihi tier tertinggi yang pernah dilihat.
  useEffect(() => {
    // Ditunda selama naga disembunyikan (Recall, tur, dungeon/menara) agar tidak memotong sesi belajar.
    if (!hatched || !mail.loaded || evolution || hatchOpen || hidden) return;
    if (tier.index > ds.lastSeenTier) {
      setEvolution({ from: DRAGON_TIERS[Math.min(ds.lastSeenTier, DRAGON_TIERS.length - 1)], to: tier });
    }
  }, [hatched, mail.loaded, tier, ds.lastSeenTier, evolution, hatchOpen, hidden]);

  // Animasi ketik pesan naga terakhir.
  useEffect(() => {
    if (!reveal) return;
    const msg = messages.find(m => m.id === reveal.id);
    if (!msg) return;
    if (reveal.len >= msg.text.length) {
      setReveal(null);
      const settle = pendingMood && pendingMood !== 'talking' ? pendingMood : 'idle';
      setMood(settle);
      setPendingMood(null);
      setBusy(false);
      if (settle !== 'idle') later(() => setMood(m => (m === settle ? 'idle' : m)), 2200);
      return;
    }
    const t = window.setTimeout(() => setReveal(r => (r ? { ...r, len: r.len + 2 } : r)), REVEAL_MS_PER_CHAR * 2);
    return () => clearTimeout(t);
  }, [reveal, messages, pendingMood, later]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, reveal?.len, view]);

  const pushDragon = useCallback((text: string, choices: DragonChoice[] | undefined, after: ReplyMood) => {
    const id = nextId.current++;
    setMessages(ms => [...ms.slice(-40), { id, from: 'dragon', text, choices }]);
    setMood('talking');
    setPendingMood(after);
    setReveal({ id, len: 0 });
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setView('chat');
  }, []);

  useBackButton(open, closePanel, 'dragon_mascot_panel');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closePanel]);

  const openPanel = () => {
    playSound('open_modal', soundEnabled);
    if (!hatched) {
      setHatchOpen(true);
      return;
    }
    if (ds.minimized) updateDs({ minimized: false });
    setOpen(true);
    if (messages.length === 0) {
      setBusy(true);
      pushDragon(greetingText(), STARTER_CHOICES, 'greeting');
    }
  };

  const runCommand = (cmd: DragonCommand) => {
    playSound('click', soundEnabled);
    if (cmd.type === 'dragon_tiers') {
      setView('tiers');
      return;
    }
    setMood('pointing');
    later(() => setMood(m => (m === 'pointing' ? 'idle' : m)), 1800);
    closePanel();
    onCommand(cmd);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    playSound('click', soundEnabled);
    const id = nextId.current++;
    setMessages(ms => [...ms.slice(-40), { id, from: 'user', text }]);
    setInput('');
    setBusy(true);
    setMood('thinking');
    const reply = interpret(text, { awaiting, name: NAME });
    later(() => {
      setAwaiting(reply.awaiting);
      pushDragon(reply.text, reply.choices, reply.mood);
    }, THINK_MS);
  };

  const pickChoice = (c: DragonChoice) => {
    if (busy) return;
    if (c.command) runCommand(c.command);
    else if (c.say) send(c.say);
  };

  const finishHatch = () => {
    updateDs({ hatchedAt: new Date().toISOString(), lastSeenTier: 0, minimized: false });
    setHatchOpen(false);
    setMood('happy');
    later(() => setMood(m => (m === 'happy' ? 'idle' : m)), 2400);
    setOpen(true);
    setBusy(true);
    pushDragon(
      `Terima kasih sudah menetaskanku! Aku ${NAME}, naga pemandumu. Aku bisa mengantarmu ke fitur mana pun dan membantu menyiapkan flashcard. Coba ketik apa yang mau kamu lakukan.`,
      STARTER_CHOICES,
      'happy',
    );
  };

  const finishEvolution = () => {
    if (!evolution) return;
    updateDs({ lastSeenTier: evolution.to.index });
    setEvolution(null);
    setMood('happy');
    later(() => setMood(m => (m === 'happy' ? 'idle' : m)), 2400);
  };

  if (hidden && !hatchOpen && !evolution) return null;

  const lastDragonId = [...messages].reverse().find(m => m.from === 'dragon')?.id;

  return (
    <>
      {/* ------------------------------------------------------------ Tombol naga */}
      {!hidden && !open && (
        ds.minimized && hatched ? (
          <button
            type="button"
            onClick={openPanel}
            aria-label={`Buka ${NAME}, naga pemandu`}
            title={`Buka ${NAME}`}
            className={`${ANCHOR} z-[45] !right-0 w-12 h-14 rounded-l-2xl bg-surface-card/95 border border-r-0 border-border-subtle shadow-lg flex items-center justify-start pl-0.5 overflow-hidden cursor-pointer`}
          >
            <DragonSprite tier={tier} mood="idle" size={52} still />
          </button>
        ) : (
          <motion.button
            type="button"
            onClick={openPanel}
            aria-label={hatched ? `Buka ${NAME}, naga pemandu` : 'Tetaskan telur naga'}
            title={hatched ? `Tanya ${NAME}` : 'Tetaskan telur naga'}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.92 }}
            className={`${ANCHOR} z-[45] w-[4.5rem] h-[4.5rem] flex items-end justify-center cursor-pointer select-none drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]`}
            style={{ touchAction: 'manipulation' }}
          >
            {hatched ? <DragonSprite tier={tier} mood={mood} size={72} /> : <DragonEgg size={64} />}
            {!hatched && (
              <span className="absolute -top-7 right-0 whitespace-nowrap px-2 py-1 rounded-xl panel border border-border-subtle text-[10px] font-bold text-text-primary shadow-md">
                Ketuk telurnya!
              </span>
            )}
          </motion.button>
        )
      )}

      {/* ------------------------------------------------------------ Panel */}
      <AnimatePresence>
        {open && !hidden && (
          <motion.section
            role="dialog"
            aria-label={`${NAME}, naga pemandu`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={`${ANCHOR} z-[45] w-[min(23rem,calc(100vw-1.5rem))] max-h-[min(34rem,calc(100dvh-8rem))] flex flex-col rounded-3xl panel border border-border-subtle shadow-2xl overflow-hidden`}
          >
            {/* Kepala panel */}
            <header className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border-subtle bg-surface-inset/40">
              {view === 'tiers' ? (
                <button
                  type="button"
                  onClick={() => { playSound('click', soundEnabled); setView('chat'); }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer"
                  aria-label="Kembali ke obrolan"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : null}
              <div className="w-14 h-14 -my-1 shrink-0 flex items-center justify-center">
                <DragonSprite tier={tier} mood={mood} size={56} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary font-heading leading-tight">{NAME}</p>
                <button
                  type="button"
                  onClick={() => { playSound('click', soundEnabled); setView('tiers'); }}
                  className="text-[10px] font-mono tracking-wider text-gold hover:underline cursor-pointer whitespace-nowrap"
                >
                  {tier.name.toUpperCase()} · lihat tier
                </button>
              </div>
              <button
                type="button"
                onClick={() => { playSound('click', soundEnabled); updateDs({ minimized: true }); closePanel(); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer"
                aria-label="Kecilkan naga ke tepi layar"
                title="Kecilkan ke tepi"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { playSound('click', soundEnabled); closePanel(); }}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {view === 'chat' ? (
              <>
                <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" aria-live="polite">
                  {messages.map(m => {
                    const revealing = reveal?.id === m.id;
                    const text = revealing ? m.text.slice(0, reveal!.len) : m.text;
                    const showChoices = m.from === 'dragon' && m.id === lastDragonId && !revealing && !busy && m.choices?.length;
                    return (
                      <div key={m.id} className={m.from === 'user' ? 'flex justify-end' : 'space-y-2'}>
                        <p
                          onClick={() => revealing && setReveal({ id: m.id, len: m.text.length })}
                          className={
                            m.from === 'user'
                              ? 'max-w-[85%] px-3 py-2 rounded-2xl rounded-br-md bg-indigo/20 border border-border-primary text-sm text-text-primary'
                              : 'max-w-[92%] px-3 py-2 rounded-2xl rounded-bl-md bg-surface-inset border border-border-subtle text-sm text-text-primary font-body leading-relaxed'
                          }
                        >
                          {text}
                          {revealing && <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-text-secondary/60 animate-pulse" />}
                        </p>
                        {showChoices ? (
                          <div className="flex flex-wrap gap-1.5">
                            {m.choices!.map((c, i) => (
                              <button
                                key={`${m.id}-${i}`}
                                type="button"
                                onClick={() => pickChoice(c)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                  i === 0 && c.command
                                    ? 'btn-physical-primary border-transparent'
                                    : 'bg-surface-card border-border-subtle text-text-primary hover:border-border-primary'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {busy && mood === 'thinking' && (
                    <p className="text-xs text-text-muted font-body px-1">{NAME} sedang berpikir…</p>
                  )}
                </div>
                <form
                  onSubmit={e => { e.preventDefault(); send(input); }}
                  className="flex items-center gap-2 p-2.5 border-t border-border-subtle"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, 160))}
                    placeholder={`Tanya ${NAME}…`}
                    aria-label={`Pesan untuk ${NAME}`}
                    className="flex-1 min-w-0 px-3.5 py-2.5 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || busy}
                    aria-label="Kirim"
                    className="w-10 h-10 rounded-2xl btn-physical-primary flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <TierList current={tier} onDonate={() => runCommand({ type: 'tab', tab: 'home' })} />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------ Menetas */}
      {hatchOpen && <HatchOverlay tier={DRAGON_TIERS[0]} soundEnabled={soundEnabled} onDone={finishHatch} onClose={() => setHatchOpen(false)} />}

      {/* ------------------------------------------------------------ Evolusi */}
      {evolution && <EvolutionOverlay from={evolution.from} to={evolution.to} soundEnabled={soundEnabled} onDone={finishEvolution} />}
    </>
  );
};

// =============================================================================== Daftar tier

const TierList: React.FC<{ current: DragonTier; onDonate: () => void }> = ({ current, onDonate }) => (
  <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
    {DRAGON_TIERS.map(t => {
      const unlocked = t.index <= current.index;
      const isCurrent = t.index === current.index;
      return (
        <div
          key={t.id}
          className={`flex items-center gap-3 p-2.5 rounded-2xl border ${
            isCurrent ? 'border-gold/60 bg-gold/10' : 'border-border-subtle bg-surface-inset/60'
          }`}
        >
          <div className={`w-12 h-12 shrink-0 flex items-center justify-center ${unlocked ? '' : 'opacity-60'}`}>
            <DragonSprite tier={t} size={48} still />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-primary font-heading leading-tight">{t.name}</p>
            <p className="text-[10px] text-text-secondary font-mono">{t.requirement}</p>
            <p className="text-[11px] text-text-secondary font-body truncate">{t.perks.join(' · ')}</p>
          </div>
          {isCurrent ? (
            <span className="text-[10px] font-bold text-gold shrink-0">AKTIF</span>
          ) : unlocked ? (
            <Check className="w-4 h-4 text-state-success shrink-0" aria-label="Terbuka" />
          ) : (
            <Lock className="w-4 h-4 text-text-muted shrink-0" aria-label="Terkunci" />
          )}
        </div>
      );
    })}
    <div className="pt-1 space-y-2">
      <p className="text-[11px] text-text-secondary font-body leading-relaxed px-1">
        Tier naga terbuka otomatis sesuai dukunganmu lewat Donasi (perlu login). Tier hanya mengubah penampilan naga dan tidak memengaruhi progres belajarmu.
      </p>
      <button
        type="button"
        onClick={onDonate}
        className="w-full py-2.5 rounded-2xl btn-physical-secondary text-xs font-bold cursor-pointer"
      >
        Ke ubin Donasi di Castle
      </button>
    </div>
  </div>
);

// =============================================================================== Overlay

const Overlay: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) =>
  createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/80" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xs rounded-3xl panel border border-border-subtle shadow-2xl p-5 flex flex-col items-center text-center gap-3"
      >
        {children}
      </motion.div>
    </div>,
    document.body,
  );

const HatchOverlay: React.FC<{ tier: DragonTier; soundEnabled: boolean; onDone: () => void; onClose: () => void }> = ({ tier, soundEnabled, onDone, onClose }) => {
  const [cracks, setCracks] = useState(0);
  const born = cracks >= 4;

  useBackButton(!born, onClose, 'dragon_hatch_overlay');

  const tap = () => {
    if (born) return;
    const next = cracks + 1;
    setCracks(next);
    playSound(next >= 4 ? 'levelup' : 'click', soundEnabled);
  };

  return (
    <Overlay label="Menetaskan telur naga">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!born ? (
            <motion.button
              key="egg"
              type="button"
              onClick={tap}
              exit={{ scale: 1.15, opacity: 0, transition: { duration: 0.25 } }}
              whileTap={{ scale: 0.94 }}
              className="cursor-pointer"
              aria-label="Ketuk telur"
            >
              <DragonEgg size={160} cracks={Math.min(cracks, 3)} />
            </motion.button>
          ) : (
            <motion.div
              key="dragon"
              initial={{ scale: 0.3, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            >
              <DragonSprite tier={tier} mood="greeting" size={160} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!born ? (
        <>
          <p className="text-base font-bold text-text-primary font-heading">Ada telur naga untukmu!</p>
          <p className="text-xs text-text-secondary font-body">
            {cracks === 0 ? 'Ketuk telurnya beberapa kali untuk menetaskan.' : cracks < 3 ? 'Terus ketuk, telurnya mulai retak…' : 'Sekali lagi!'}
          </p>
          <button type="button" onClick={onClose} className="text-[11px] text-text-muted hover:text-text-secondary cursor-pointer">Nanti saja</button>
        </>
      ) : (
        <>
          <p className="text-base font-bold text-text-primary font-heading">Naga {tier.name} menetas!</p>
          <p className="text-xs text-text-secondary font-body">Namanya {NAME}. Ia akan menemanimu dan memandu di SevnQuest.</p>
          <button type="button" onClick={onDone} className="w-full py-2.5 rounded-2xl btn-physical-primary text-sm font-bold cursor-pointer">
            Halo, {NAME}!
          </button>
        </>
      )}
    </Overlay>
  );
};

const EvolutionOverlay: React.FC<{ from: DragonTier; to: DragonTier; soundEnabled: boolean; onDone: () => void }> = ({ from, to, soundEnabled, onDone }) => {
  const [stage, setStage] = useState<'before' | 'evolving' | 'after'>('before');

  useEffect(() => {
    const a = window.setTimeout(() => setStage('evolving'), 700);
    const b = window.setTimeout(() => {
      setStage('after');
      playSound('fanfare', soundEnabled);
    }, 2600);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [soundEnabled]);

  return (
    <Overlay label="Naga berevolusi">
      <div className="w-44 h-44 flex items-center justify-center">
        <DragonSprite tier={stage === 'after' ? to : from} mood={stage === 'after' ? 'happy' : stage === 'evolving' ? 'evolving' : 'idle'} size={160} />
      </div>
      {stage === 'after' ? (
        <>
          <p className="text-base font-bold text-text-primary font-heading">{NAME} berevolusi!</p>
          <p className="text-xs text-text-secondary font-body">
            Sekarang {to.name}. Terima kasih atas dukunganmu untuk SevnQuest. Terbuka: {to.perks.join(', ')}.
          </p>
          <button type="button" onClick={onDone} className="w-full py-2.5 rounded-2xl btn-physical-primary text-sm font-bold cursor-pointer">
            Keren!
          </button>
        </>
      ) : (
        <p className="text-sm font-bold text-text-primary font-heading">{NAME} sedang berevolusi…</p>
      )}
    </Overlay>
  );
};
