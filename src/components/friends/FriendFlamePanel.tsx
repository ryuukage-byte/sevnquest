import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Flame, X, RefreshCw, Copy, Check, UserPlus, BellRing, Clock, Trash2, Info, ChevronRight, Megaphone,
} from 'lucide-react';
import {
  FlameLook,
  FlameProgress,
  FriendStreak,
  canNudge,
  flameCaption,
  flameLook,
  normalizeFriendCode,
} from '../../lib/friendStreakCore';
import {
  nudgeFriend,
  refreshFriendStatus,
  removeFriend,
  requestFriend,
  respondFriend,
  useFriendStatus,
} from '../../lib/friendStreak';
import { playSound } from '../../utils/audio';

interface FriendFlamePanelProps {
  progress: FlameProgress;
  soundEnabled?: boolean;
  onClose: () => void;
  onOpenMissions?: () => void;
}

const FLAME_COLOR: Record<FlameLook, string> = {
  lit: 'text-orange-400 fill-orange-400',
  half: 'text-amber-400 fill-amber-400/40',
  risk: 'text-amber-500/80',
  out: 'text-text-muted',
};

/** Api kecil + angka streak pasangan. */
export const FlameBadge: React.FC<{ look: FlameLook; days: number; size?: 'sm' | 'lg' }> = ({ look, days, size = 'sm' }) => (
  <span className={`relative inline-flex flex-col items-center justify-center shrink-0 ${size === 'lg' ? 'w-12' : 'w-10'}`}>
    <Flame className={`${size === 'lg' ? 'w-9 h-9' : 'w-7 h-7'} ${FLAME_COLOR[look]}`} />
    <span className={`font-mono font-black leading-none ${size === 'lg' ? 'text-sm' : 'text-xs'} ${look === 'out' ? 'text-text-muted' : 'text-gold'}`}>
      {days}
    </span>
  </span>
);

const Tick: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
  <span
    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
      done ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-border-subtle text-text-muted bg-surface-inset'
    }`}
  >
    {done ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
    {label}
  </span>
);

/** Modal "Api Bareng": kode teman, ajak teman, daftar api, ingatkan teman. */
export const FriendFlamePanel: React.FC<FriendFlamePanelProps> = ({ progress, soundEnabled, onClose, onOpenMissions }) => {
  const status = useFriendStatus();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const meDone = status.meDone || progress.ready;
  const incoming = status.friends.filter(f => f.status === 'pending' && f.incoming);
  const outgoing = status.friends.filter(f => f.status === 'pending' && !f.incoming);
  const active = status.friends.filter(f => f.status === 'active');

  const say = (text: string, ok: boolean) => {
    setNotice({ text, ok });
    playSound(ok ? 'correct' : 'wrong', soundEnabled);
  };

  const reload = async () => {
    setLoading(true);
    await refreshFriendStatus();
    setLoading(false);
  };

  const copyCode = async () => {
    if (!status.myCode) return;
    try {
      await navigator.clipboard.writeText(status.myCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia */
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeFriendCode(code);
    if (!normalized) {
      say('Format kode teman: SQ-XXXX-XXXX.', false);
      return;
    }
    setBusy('add');
    const res = await requestFriend(normalized);
    setBusy(null);
    if (!res.ok) return say(res.error, false);
    setCode('');
    say(res.data === 'accepted' ? 'Kalian sekarang berteman! Nyalakan api bareng mulai hari ini.' : 'Ajakan terkirim. Tunggu dia menerima.', true);
  };

  const act = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (res.ok) say(okText, true);
    else say((res as { error: string }).error, false);
  };

  const renderFriend = (f: FriendStreak) => {
    const look = flameLook(f, meDone);
    return (
      <li key={f.id} className="panel !p-3 space-y-2">
        <div className="flex items-center gap-3">
          <FlameBadge look={look} days={f.streakDays} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-text-primary truncate">{f.friendName}</div>
            <div className="text-[11px] text-text-secondary leading-snug">{flameCaption(f, meDone)}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Tick done={meDone} label="Kamu" />
              <Tick done={f.friendDone} label={f.friendName.length > 12 ? 'Dia' : f.friendName} />
              {f.longestStreak > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-text-muted bg-surface-inset border border-border-subtle">
                  Rekor {f.longestStreak}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {canNudge(f) ? (
              <button
                type="button"
                disabled={busy === f.id}
                onClick={() => void act(f.id, () => nudgeFriend(f.id), `${f.friendName} sudah diingatkan.`)}
                className="btn btn-pill text-xs inline-flex items-center gap-1"
                title={`Ingatkan ${f.friendName} untuk belajar`}
              >
                <BellRing className="w-3.5 h-3.5" /> Ingatkan
              </button>
            ) : (
              !f.friendDone && f.iNudged && <span className="text-[10px] text-text-muted">Sudah diingatkan</span>
            )}
            <button
              type="button"
              onClick={() => setConfirmRemove(confirmRemove === f.id ? null : f.id)}
              className="p-1 text-text-muted hover:text-wine-accent"
              aria-label={`Hapus ${f.friendName} dari teman`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {f.nudgedMe && !meDone && (
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
            <Megaphone className="w-3.5 h-3.5 shrink-0" />
            {f.friendName} ngingetin kamu: ayo belajar biar apinya nggak padam!
          </div>
        )}
        {confirmRemove === f.id && (
          <div className="flex items-center justify-between gap-2 text-[11px] text-text-secondary">
            Hapus teman? Api kalian ({f.streakDays}) akan hilang.
            <span className="flex gap-1">
              <button type="button" className="btn btn-pill text-xs" onClick={() => setConfirmRemove(null)}>Batal</button>
              <button
                type="button"
                className="btn btn-pill text-xs !text-wine-accent"
                disabled={busy === f.id}
                onClick={() => {
                  setConfirmRemove(null);
                  void act(f.id, () => removeFriend(f.id), 'Teman dihapus.');
                }}
              >
                Hapus
              </button>
            </span>
          </div>
        )}
      </li>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9960] flex items-stretch sm:items-center justify-center sm:p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="Api Bareng"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg panel panel-stitched !rounded-none sm:!rounded-3xl flex flex-col max-h-[100dvh] sm:max-h-[92dvh] overflow-hidden"
      >
        <div className="p-4 sm:p-5 pb-3 border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 ui-icon-box rounded-xl shrink-0">
              <Flame className="w-6 h-6 text-orange-400 fill-orange-400/60" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold font-heading text-text-primary">Api Bareng</h2>
              <button
                type="button"
                onClick={() => void copyCode()}
                className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary"
                title="Salin kode teman"
                disabled={!status.myCode}
              >
                Kode temanmu: <span className="font-mono font-bold text-gold-soft">{status.myCode ?? '…'}</span>
                {status.myCode && (copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />)}
              </button>
            </div>
            <button type="button" onClick={() => void reload()} className="btn btn-pill text-xs" aria-label="Muat ulang" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="btn btn-pill text-xs" aria-label="Tutup Api Bareng">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Progres menyalakan api hari ini */}
          <button
            type="button"
            onClick={onOpenMissions}
            className="w-full text-left panel !p-3 flex items-center gap-3 hover:bg-surface-elevated/40 transition-colors group"
          >
            <FlameBadge look={meDone ? 'lit' : 'out'} days={progress.done} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-text-primary">
                {meDone ? 'Apimu hari ini sudah menyala' : 'Apimu hari ini belum menyala'}
              </div>
              <div className="text-[11px] text-text-secondary">
                Misi harian selesai {progress.done}/{progress.required}
                {!meDone && ' — selesaikan untuk menyalakan api bareng temanmu'}
              </div>
              <div className="h-1.5 mt-1.5 w-full bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
                <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${(progress.done / progress.required) * 100}%` }} />
              </div>
            </div>
            {onOpenMissions && <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-gold shrink-0" />}
          </button>

          {notice && (
            <div
              role="status"
              className={`rounded-xl px-3 py-2 text-xs border ${
                notice.ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-wine-accent/40 bg-wine-accent/10 text-text-primary'
              }`}
            >
              {notice.text}
            </div>
          )}
          {status.error && !notice && (
            <div className="rounded-xl px-3 py-2 text-xs border border-wine-accent/40 bg-wine-accent/10 text-text-primary">{status.error}</div>
          )}

          {/* Ajak teman */}
          <form onSubmit={submitCode} className="space-y-1.5">
            <label htmlFor="friend-code" className="text-xs font-bold text-text-primary">Ajak teman</label>
            <div className="flex gap-2">
              <input
                id="friend-code"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="SQ-XXXX-XXXX"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={20}
                className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm font-mono bg-surface-inset border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold/60"
              />
              <button type="submit" disabled={busy === 'add' || !code.trim()} className="btn btn-pill text-xs inline-flex items-center gap-1.5 shrink-0">
                <UserPlus className="w-4 h-4" /> Ajak
              </button>
            </div>
            <p className="text-[11px] text-text-muted">Bagikan kode temanmu di atas, atau masukkan kode teman di sini.</p>
          </form>

          {incoming.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary">Ajakan masuk</h3>
              <ul className="space-y-2">
                {incoming.map(f => (
                  <li key={f.id} className="panel !p-3 flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-gold shrink-0" />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-bold text-text-primary">{f.friendName}</span>
                      <span className="text-text-secondary"> ngajak nyalain api bareng</span>
                    </div>
                    <button
                      type="button"
                      disabled={busy === f.id}
                      className="btn btn-pill text-xs"
                      onClick={() => void act(f.id, () => respondFriend(f.id, false), 'Ajakan ditolak.')}
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={busy === f.id}
                      className="btn btn-pill text-xs !text-gold"
                      onClick={() => void act(f.id, () => respondFriend(f.id, true), `Kamu sekarang berteman dengan ${f.friendName}!`)}
                    >
                      Terima
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-xs font-bold text-text-primary">Api kalian</h3>
            {active.length === 0 ? (
              <p className="text-xs text-text-muted panel !p-3">
                Belum ada teman. Ajak teman belajar pakai kode teman, lalu jaga api kalian tetap menyala setiap hari.
              </p>
            ) : (
              <ul className="space-y-2">{active.map(renderFriend)}</ul>
            )}
          </section>

          {outgoing.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-text-primary">Menunggu diterima</h3>
              <ul className="space-y-1.5">
                {outgoing.map(f => (
                  <li key={f.id} className="flex items-center gap-2 text-xs text-text-secondary">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 truncate">{f.friendName} <span className="font-mono text-text-muted">{f.friendCode}</span></span>
                    <button
                      type="button"
                      disabled={busy === f.id}
                      className="btn btn-pill text-xs"
                      onClick={() => void act(f.id, () => removeFriend(f.id), 'Ajakan dibatalkan.')}
                    >
                      Batal
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex gap-2 rounded-xl p-3 bg-surface-inset border border-border-subtle text-[11px] text-text-secondary leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-indigo mt-0.5" />
            <div>
              Api bertambah 1 setiap hari kamu <b>dan</b> temanmu sama-sama menyelesaikan {progress.required} misi harian.
              Kalau salah satu bolos sehari, api padam dan mulai lagi dari 1. Teman yang belum belajar bisa kamu
              ingatkan sekali sehari. Hari dihitung sampai pukul 24.00 WIB.
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
