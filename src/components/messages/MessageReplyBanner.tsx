import React from 'react';
import { ChevronRight, Mail, Inbox } from 'lucide-react';
import { requestOpenMessages, useMessageUnread } from '../../lib/messages';
import { playSound } from '../../utils/audio';

/**
 * Kartu dashboard: "Admin membalas pesanmu" (pemain) / "N pesan baru dari pemain" (admin).
 * Tidak tampil bila tidak ada yang belum dibaca.
 */
export const MessageReplyBanner: React.FC<{ onOpenSettings: () => void; soundEnabled?: boolean }> = ({
  onOpenSettings,
  soundEnabled,
}) => {
  const { userUnread, adminUnread, isAdmin } = useMessageUnread();
  const items: { key: string; Icon: typeof Mail; label: string; title: string; scroll: boolean }[] = [];
  if (userUnread > 0) {
    items.push({
      key: 'user',
      Icon: Mail,
      label: 'Pesan',
      title: userUnread === 1 ? 'Admin membalas pesanmu' : `${userUnread} balasan baru dari admin`,
      scroll: true,
    });
  }
  if (isAdmin && adminUnread > 0) {
    items.push({
      key: 'admin',
      Icon: Inbox,
      label: 'Kotak Masuk Admin',
      title: `${adminUnread} pesan pemain belum dibaca`,
      scroll: false,
    });
  }
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map(it => (
        <button
          key={it.key}
          type="button"
          onClick={() => {
            playSound('open_modal', soundEnabled);
            if (it.scroll) requestOpenMessages();
            onOpenSettings();
          }}
          className="panel !p-0 overflow-hidden border-l-4 border-l-indigo w-full block text-left hover:bg-surface-elevated/40 transition-colors"
        >
          <span className="flex items-center gap-3 p-3 sm:p-4">
            <span className="w-10 h-10 ui-icon-box rounded-xl shrink-0 text-indigo">
              <it.Icon className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="breadcrumb-label text-indigo">{it.label}</span>
              <span className="block text-sm font-bold font-heading text-text-primary truncate">{it.title}</span>
              <span className="block text-xs text-text-secondary">Ketuk untuk membuka percakapan</span>
            </span>
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
          </span>
        </button>
      ))}
    </div>
  );
};
