import React, { useCallback, useEffect, useState } from 'react';
import { Inbox, RefreshCw, ChevronRight } from 'lucide-react';
import {
  MessageThread,
  ThreadFilter,
  categoryLabel,
  filterThreads,
  relativeTime,
  sortThreads,
} from '../../lib/messagesCore';
import { adminListThreads } from '../../lib/messages';
import { playSound } from '../../utils/audio';
import { StatusPill, ThreadView, UnreadPill } from './ThreadView';

const FILTERS: { value: ThreadFilter; label: string }[] = [
  { value: 'open', label: 'Terbuka' },
  { value: 'unread', label: 'Belum dibaca' },
  { value: 'closed', label: 'Selesai' },
  { value: 'all', label: 'Semua' },
];

/** Kotak masuk admin — hanya dirender untuk admin (lihat SettingsView). Keamanan sebenarnya dijaga RLS. */
export const AdminInboxPanel: React.FC<{ soundEnabled?: boolean }> = ({ soundEnabled }) => {
  const [list, setList] = useState<MessageThread[]>([]);
  const [filter, setFilter] = useState<ThreadFilter>('open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await adminListThreads();
    setLoading(false);
    if (res.ok) {
      setList(res.data);
      setError(null);
    } else setError(res.error);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unreadTotal = list.reduce((n, t) => n + t.adminUnread, 0);
  const shown = sortThreads(filterThreads(list, filter, 'admin'), 'admin');
  const countOf = (f: ThreadFilter) => filterThreads(list, f, 'admin').length;

  return (
    <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <Inbox className="w-4 h-4 text-indigo" /> Kotak Masuk Admin
          <UnreadPill count={unreadTotal} />
        </h3>
        {!openId && (
          <button type="button" onClick={() => void refresh()} className="btn btn-pill text-xs" aria-label="Muat ulang" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {openId ? (
        <ThreadView
          threadId={openId}
          viewer="admin"
          soundEnabled={soundEnabled}
          onBack={() => {
            setOpenId(null);
            void refresh();
          }}
          onChanged={() => void refresh()}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  filter === f.value
                    ? 'bg-surface-elevated border-gold/60 text-text-primary'
                    : 'bg-surface-inset border-border-subtle text-text-muted'
                }`}
              >
                {f.label} ({countOf(f.value)})
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-wine-accent">{error}</p>}

          {shown.length === 0 && !loading && !error && (
            <p className="text-[11px] text-text-muted">Tidak ada percakapan di sini.</p>
          )}

          <ul className="space-y-2">
            {shown.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    playSound('open_modal', soundEnabled);
                    setOpenId(t.id);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors hover:bg-surface-elevated/50 ${
                    t.adminUnread > 0 ? 'bg-surface-elevated/40 border-gold/50' : 'bg-surface-inset border-border-subtle'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusPill status={t.status} />
                      <span className="text-[10px] text-text-muted">{categoryLabel(t.category)}</span>
                      {t.lastSender === 'user' && t.status === 'open' && (
                        <span className="text-[10px] font-bold text-gold">Menunggu balasan</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-text-primary truncate">{t.subject}</p>
                    <p className="text-[10px] text-text-muted truncate">
                      {t.userName || 'Pemain tanpa nama'} · {relativeTime(t.lastMessageAt)}
                    </p>
                  </div>
                  <UnreadPill count={t.adminUnread} />
                  <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
