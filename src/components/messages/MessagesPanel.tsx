import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mail, PenLine, Send, X, ChevronRight, LogIn, RefreshCw } from 'lucide-react';
import {
  CATEGORIES,
  EMPTY_THREAD_DRAFT,
  MESSAGE_LIMITS,
  MessageThread,
  NewThreadDraft,
  categoryLabel,
  relativeTime,
  sortThreads,
  validateNewThread,
} from '../../lib/messagesCore';
import { consumeOpenMessagesRequest, createThread, listMyThreads } from '../../lib/messages';
import { playSound } from '../../utils/audio';
import { INPUT, StatusPill, ThreadView, UnreadPill } from './ThreadView';

const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-text-secondary';

interface MessagesPanelProps {
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  playerName?: string;
  soundEnabled?: boolean;
}

/** "Pesan ke Admin" untuk pemain: daftar percakapan, tulis pesan baru, dan baca balasan admin. */
export const MessagesPanel: React.FC<MessagesPanelProps> = ({ isAuthenticated, onOpenAuth, playerName, soundEnabled }) => {
  const [list, setList] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<NewThreadDraft>(EMPTY_THREAD_DRAFT);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const res = await listMyThreads();
    setLoading(false);
    if (res.ok) {
      setList(res.data);
      setError(null);
    } else setError(res.error);
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Dibuka dari kartu dashboard "Admin membalas" => gulir ke panel ini & buka percakapan teratas yang belum dibaca.
  useEffect(() => {
    if (consumeOpenMessagesRequest()) {
      window.setTimeout(() => rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
  }, []);

  const set = <K extends keyof NewThreadDraft>(k: K, v: NewThreadDraft[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setError(null);
    setNotice(null);
  };

  const submit = async () => {
    const v = validateNewThread(draft);
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    const res = await createThread(draft, playerName);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    playSound('correct', soundEnabled);
    setDraft(EMPTY_THREAD_DRAFT);
    setComposing(false);
    setNotice('Pesan terkirim. Balasan admin akan muncul di sini.');
    await refresh();
  };

  const sorted = sortThreads(list, 'user');
  const openCount = list.filter(t => t.status === 'open').length;

  return (
    <div ref={rootRef} id="pesan-admin" className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md scroll-mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <Mail className="w-4 h-4 text-indigo" /> Pesan ke Admin
        </h3>
        {isAuthenticated && !openId && (
          <button type="button" onClick={() => void refresh()} className="btn btn-pill text-xs" aria-label="Muat ulang" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {!isAuthenticated ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-text-secondary">
            Punya pertanyaan, menemukan bug, atau ingin memberi saran? Masuk ke akun agar bisa mengirim pesan dan menerima balasan admin.
          </p>
          <button type="button" onClick={onOpenAuth} className="btn btn-pill text-xs gap-1.5 shrink-0 text-indigo">
            <LogIn className="w-3.5 h-3.5" /> Masuk
          </button>
        </div>
      ) : openId ? (
        <ThreadView
          threadId={openId}
          viewer="user"
          soundEnabled={soundEnabled}
          onBack={() => {
            setOpenId(null);
            void refresh();
          }}
          onChanged={() => void refresh()}
        />
      ) : (
        <>
          {!composing && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-text-secondary">
                Kirim pertanyaan, laporan bug, atau saran langsung ke admin. Balasan muncul di sini dan di dashboard.
              </p>
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setComposing(true);
                  setNotice(null);
                }}
                disabled={openCount >= MESSAGE_LIMITS.openThreads}
                className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 text-indigo shrink-0 disabled:opacity-50"
              >
                <PenLine className="w-3.5 h-3.5" /> Pesan Baru
              </button>
            </div>
          )}

          {!composing && openCount >= MESSAGE_LIMITS.openThreads && (
            <p className="text-[11px] text-text-muted">
              Kamu punya {openCount} percakapan terbuka. Lanjutkan di percakapan yang ada sampai admin menandainya selesai.
            </p>
          )}

          {composing && (
            <div className="space-y-3 rounded-2xl bg-surface-inset/50 border border-border-subtle p-3">
              <div className="space-y-1.5">
                <span className={LABEL}>Kategori</span>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => set('category', c.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                        draft.category === c.value
                          ? 'bg-surface-elevated border-gold/60 text-text-primary'
                          : 'bg-surface-inset border-border-subtle text-text-muted'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className={LABEL}>Subjek</span>
                <input
                  value={draft.subject}
                  onChange={e => set('subject', e.target.value)}
                  maxLength={MESSAGE_LIMITS.subject}
                  placeholder="mis. Progres hilang setelah ganti HP"
                  className={INPUT}
                />
              </label>
              <label className="block space-y-1.5">
                <span className={LABEL}>Pesan</span>
                <textarea
                  value={draft.body}
                  onChange={e => set('body', e.target.value)}
                  maxLength={MESSAGE_LIMITS.body}
                  rows={5}
                  placeholder="Ceritakan selengkapnya. Untuk bug: apa yang kamu lakukan, apa yang terjadi, di perangkat apa."
                  className={`${INPUT} resize-y`}
                />
                <span className="block text-[10px] text-text-muted text-right">{draft.body.length}/{MESSAGE_LIMITS.body}</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy}
                  className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 text-indigo disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> {busy ? 'Mengirim…' : 'Kirim ke Admin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposing(false);
                    setError(null);
                  }}
                  className="btn btn-pill text-xs gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Batal
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-wine-accent">{error}</p>}
          {notice && <p className="text-xs text-emerald-400">{notice}</p>}

          {sorted.length > 0 && (
            <ul className="space-y-2">
              {sorted.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('open_modal', soundEnabled);
                      setOpenId(t.id);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors hover:bg-surface-elevated/50 ${
                      t.userUnread > 0 ? 'bg-surface-elevated/40 border-gold/50' : 'bg-surface-inset border-border-subtle'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusPill status={t.status} />
                        <span className="text-[10px] text-text-muted">{categoryLabel(t.category)}</span>
                        {t.userUnread > 0 && (
                          <span className="text-[10px] font-bold text-wine-accent">Admin membalas</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-text-primary truncate">{t.subject}</p>
                      <p className="text-[10px] text-text-muted">
                        {t.lastSender === 'admin' ? 'Balasan admin' : 'Pesanmu'} · {relativeTime(t.lastMessageAt)}
                      </p>
                    </div>
                    <UnreadPill count={t.userUnread} />
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && !error && sorted.length === 0 && !composing && (
            <p className="text-[11px] text-text-muted">Belum ada percakapan.</p>
          )}
        </>
      )}
    </div>
  );
};
