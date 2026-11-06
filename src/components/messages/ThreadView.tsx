import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, RefreshCw, Lock, Unlock, Trash2, ShieldCheck, User } from 'lucide-react';
import {
  ChatMessage,
  MESSAGE_LIMITS,
  MessageThread,
  categoryLabel,
  relativeTime,
  validateBody,
} from '../../lib/messagesCore';
import {
  adminDeleteThread,
  adminSetThreadStatus,
  getThread,
  listThreadMessages,
  markThreadRead,
  sendMessage,
} from '../../lib/messages';
import { playSound } from '../../utils/audio';

const POLL_MS = 20 * 1000;

export const INPUT =
  'w-full bg-surface-inset border border-border-subtle focus:border-border-primary rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors shadow-inner';

export function StatusPill({ status }: { status: MessageThread['status'] }) {
  return status === 'open' ? (
    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
      Terbuka
    </span>
  ) : (
    <span className="px-1.5 py-0.5 rounded-full bg-surface-inset text-text-muted text-[9px] font-black uppercase tracking-wider border border-border-subtle">
      Selesai
    </span>
  );
}

export function UnreadPill({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-wine-accent text-white text-[10px] font-black inline-flex items-center justify-center">
      {count > 9 ? '9+' : count}
    </span>
  );
}

interface ThreadViewProps {
  threadId: string;
  viewer: 'user' | 'admin';
  onBack: () => void;
  /** Dipanggil setelah status/isi berubah agar daftar di induk ikut segar. */
  onChanged?: () => void;
  soundEnabled?: boolean;
}

/** Isi satu percakapan: gelembung chat + kotak balas. Dipakai pemain dan admin. */
export const ThreadView: React.FC<ThreadViewProps> = ({ threadId, viewer, onBack, onChanged, soundEnabled }) => {
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const [t, m] = await Promise.all([getThread(threadId), listThreadMessages(threadId)]);
      setLoading(false);
      if (t.ok) setThread(t.data);
      if (m.ok) setMessages(m.data);
      if (!t.ok) setError(t.error);
      else if (!m.ok) setError(m.error);
      const unread = t.ok && t.data ? (viewer === 'admin' ? t.data.adminUnread : t.data.userUnread) : 0;
      if (unread > 0) {
        await markThreadRead(threadId);
        onChangedRef.current?.();
      }
    },
    [threadId, viewer],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages.length]);

  const send = async () => {
    const v = validateBody(reply);
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await sendMessage(threadId, reply);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    playSound('correct', soundEnabled);
    setReply('');
    await load(true);
    onChanged?.();
  };

  const toggleStatus = async () => {
    if (!thread) return;
    const next = thread.status === 'open' ? 'closed' : 'open';
    setBusy(true);
    const res = await adminSetThreadStatus(thread.id, next);
    setBusy(false);
    if (!res.ok) setError(res.error);
    await load(true);
    onChanged?.();
  };

  const remove = async () => {
    if (!thread) return;
    if (!window.confirm(`Hapus percakapan "${thread.subject}" beserta semua pesannya? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const res = await adminDeleteThread(thread.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onChanged?.();
    onBack();
  };

  const mineIsAdmin = viewer === 'admin';

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <button type="button" onClick={onBack} className="btn btn-pill text-xs gap-1.5 shrink-0" aria-label="Kembali">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold font-heading text-text-primary break-words">{thread?.subject ?? (loading ? 'Memuat…' : '—')}</p>
          {thread && (
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-text-muted mt-0.5">
              <StatusPill status={thread.status} />
              <span>{categoryLabel(thread.category)}</span>
              {viewer === 'admin' && <span>· dari {thread.userName || 'Pemain tanpa nama'}</span>}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="btn btn-pill text-xs shrink-0"
          aria-label="Muat ulang"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="rounded-2xl bg-surface-inset border border-border-subtle p-3 space-y-2.5 max-h-[55vh] overflow-y-auto">
        {messages.length === 0 && !loading && <p className="text-xs text-text-muted text-center py-6">Belum ada pesan.</p>}
        {messages.map(m => {
          const mine = m.fromAdmin === mineIsAdmin;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 border shadow-sm ${
                  mine
                    ? 'bg-surface-elevated border-gold/40 rounded-br-md'
                    : 'bg-surface-card border-border-subtle rounded-bl-md'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold mb-0.5">
                  {m.fromAdmin ? (
                    <span className="text-indigo flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Admin SevnQuest
                    </span>
                  ) : (
                    <span className="text-text-secondary flex items-center gap-1">
                      <User className="w-3 h-3" /> {viewer === 'user' ? 'Kamu' : thread?.userName || 'Pemain'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[9px] text-text-muted text-right mt-1" title={new Date(m.createdAt).toLocaleString('id-ID')}>
                  {relativeTime(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {thread?.status === 'closed' && viewer === 'user' && (
        <p className="text-[11px] text-text-muted">
          Percakapan ini sudah ditandai selesai oleh admin. Kirim pesan lagi untuk membukanya kembali.
        </p>
      )}

      <div className="space-y-2">
        <textarea
          value={reply}
          onChange={e => {
            setReply(e.target.value);
            setError(null);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send();
          }}
          rows={3}
          maxLength={MESSAGE_LIMITS.body}
          placeholder={viewer === 'admin' ? 'Tulis balasan untuk pemain…' : 'Tulis pesan…'}
          className={`${INPUT} resize-y`}
          disabled={busy || !thread}
        />
        {error && <p className="text-xs text-wine-accent">{error}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || !reply.trim() || !thread}
            className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 text-indigo disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {viewer === 'admin' ? 'Kirim Balasan' : 'Kirim'}
          </button>
          <span className="text-[10px] text-text-muted">{reply.length}/{MESSAGE_LIMITS.body}</span>
          {viewer === 'admin' && thread && (
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => void toggleStatus()} disabled={busy} className="btn btn-pill text-xs gap-1.5">
                {thread.status === 'open' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {thread.status === 'open' ? 'Tandai Selesai' : 'Buka Lagi'}
              </button>
              <button type="button" onClick={() => void remove()} disabled={busy} className="btn btn-pill text-xs gap-1.5 text-wine-accent">
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
