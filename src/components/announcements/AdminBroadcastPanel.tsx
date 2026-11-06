import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Send, Save, Eye, EyeOff, Pencil, Trash2, RefreshCw, X } from 'lucide-react';
import {
  ANNOUNCEMENT_LIMITS,
  Announcement,
  AnnouncementDraft,
  AnnouncementKind,
  EMPTY_DRAFT,
  announcementToDraft,
  isAnnouncementActive,
  validateDraft,
} from '../../lib/announcementsCore';
import {
  adminDeleteAnnouncement,
  adminListAnnouncements,
  adminSaveAnnouncement,
  adminSetPublished,
} from '../../lib/announcements';
import { AnnouncementCard, KIND_META } from './AnnouncementModal';

const INPUT =
  'w-full bg-surface-inset border border-border-subtle focus:border-border-primary rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors shadow-inner';
const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-text-secondary';

/** ISO -> nilai <input type="datetime-local"> (waktu lokal). */
function toLocalInput(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** nilai datetime-local (waktu lokal) -> ISO. */
function fromLocalInput(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusOf(a: Announcement): { label: string; tone: string } {
  if (!a.isPublished) return { label: 'Draf', tone: 'text-text-muted' };
  if (isAnnouncementActive(a)) return { label: 'Tayang', tone: 'text-emerald-400' };
  if (Date.parse(a.startsAt) > Date.now()) return { label: 'Terjadwal', tone: 'text-indigo' };
  return { label: 'Berakhir', tone: 'text-text-muted' };
}

/** Panel Broadcast — hanya dirender untuk admin (lihat SettingsView). Keamanan sebenarnya dijaga RLS. */
export const AdminBroadcastPanel: React.FC = () => {
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await adminListAnnouncements();
    setLoading(false);
    if (res.ok) setList(res.data);
    else setError(res.error);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const set = <K extends keyof AnnouncementDraft>(k: K, v: AnnouncementDraft[K]) => {
    setDraft(d => ({ ...d, [k]: v }));
    setError(null);
    setNotice(null);
  };

  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingId(null);
    setPreview(false);
  };

  const save = async (publish: boolean) => {
    const v = validateDraft(draft);
    if (v) {
      setError(v);
      return;
    }
    if (publish && !window.confirm('Kirim pengumuman ini ke SEMUA pemain sekarang?')) return;
    setBusy(true);
    const res = await adminSaveAnnouncement(draft, publish, editingId ?? undefined);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice(publish ? 'Pengumuman terkirim.' : 'Draf tersimpan.');
    resetForm();
    void refresh();
  };

  const togglePublish = async (a: Announcement) => {
    if (!a.isPublished && !window.confirm(`Tayangkan "${a.title}" ke semua pemain?`)) return;
    setBusy(true);
    const res = await adminSetPublished(a.id, !a.isPublished);
    setBusy(false);
    if (!res.ok) setError(res.error);
    void refresh();
  };

  const remove = async (a: Announcement) => {
    if (!window.confirm(`Hapus pengumuman "${a.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const res = await adminDeleteAnnouncement(a.id);
    setBusy(false);
    if (!res.ok) setError(res.error);
    if (editingId === a.id) resetForm();
    void refresh();
  };

  const edit = (a: Announcement) => {
    setDraft(announcementToDraft(a));
    setEditingId(a.id);
    setError(null);
    setNotice(null);
  };

  return (
    <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <Megaphone className="w-4 h-4 text-gold" /> Broadcast Pengumuman
          <span className="px-2 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-[9px] text-gold">ADMIN</span>
        </h3>
        {editingId && (
          <button type="button" onClick={resetForm} className="text-[11px] font-bold text-text-muted hover:text-text-primary flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Batal edit
          </button>
        )}
      </div>

      <p className="text-xs text-text-secondary">
        Pengumuman muncul sebagai pop-up saat pemain membuka aplikasi (sekali per perangkat). Format:
        {' '}<code>## Judul</code>, <code>- butir</code>, <code>**tebal**</code>, <code>---</code>.
      </p>

      {/* Form */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className={LABEL} htmlFor="ann-title">Judul</label>
          <input
            id="ann-title"
            className={INPUT}
            value={draft.title}
            maxLength={ANNOUNCEMENT_LIMITS.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Update Besar SevnQuest Akan Datang!"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between">
            <label className={LABEL} htmlFor="ann-body">Isi</label>
            <span className="text-[10px] text-text-muted">{draft.body.length}/{ANNOUNCEMENT_LIMITS.body}</span>
          </div>
          <textarea
            id="ann-body"
            className={`${INPUT} min-h-[180px] font-mono text-xs leading-relaxed`}
            value={draft.body}
            maxLength={ANNOUNCEMENT_LIMITS.body}
            onChange={e => set('body', e.target.value)}
            placeholder={'Halo para petualang!\n\n## Apa yang baru?\n- Fitur A\n- Fitur B'}
          />
        </div>

        <div className="space-y-1">
          <span className={LABEL}>Jenis</span>
          <div className="flex gap-2">
            {(Object.keys(KIND_META) as AnnouncementKind[]).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => set('kind', k)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  draft.kind === k
                    ? `bg-surface-elevated border-gold/60 ${KIND_META[k].tone}`
                    : 'bg-surface-inset border-border-subtle text-text-muted'
                }`}
              >
                {KIND_META[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className={LABEL} htmlFor="ann-cta-label">Label tombol (opsional)</label>
            <input
              id="ann-cta-label"
              className={INPUT}
              value={draft.ctaLabel}
              maxLength={ANNOUNCEMENT_LIMITS.ctaLabel}
              onChange={e => set('ctaLabel', e.target.value)}
              placeholder="Isi survei"
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL} htmlFor="ann-cta-url">URL tombol (opsional)</label>
            <input
              id="ann-cta-url"
              className={INPUT}
              type="url"
              value={draft.ctaUrl}
              maxLength={ANNOUNCEMENT_LIMITS.ctaUrl}
              onChange={e => set('ctaUrl', e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <label className={LABEL} htmlFor="ann-start">Mulai tayang</label>
            <input
              id="ann-start"
              className={INPUT}
              type="datetime-local"
              value={toLocalInput(draft.startsAt)}
              onChange={e => set('startsAt', fromLocalInput(e.target.value))}
            />
            <p className="text-[10px] text-text-muted">Kosong = sekarang</p>
          </div>
          <div className="space-y-1">
            <label className={LABEL} htmlFor="ann-end">Berakhir</label>
            <input
              id="ann-end"
              className={INPUT}
              type="datetime-local"
              value={toLocalInput(draft.endsAt)}
              onChange={e => set('endsAt', fromLocalInput(e.target.value))}
            />
            <p className="text-[10px] text-text-muted">Kosong = tanpa batas</p>
          </div>
        </div>

        {error && <p className="text-xs font-bold text-wine-accent">{error}</p>}
        {notice && <p className="text-xs font-bold text-emerald-400">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreview(p => !p)}
            className="btn btn-pill text-xs gap-1.5"
            disabled={!draft.title.trim() && !draft.body.trim()}
          >
            <Eye className="w-3.5 h-3.5" /> {preview ? 'Tutup pratinjau' : 'Pratinjau'}
          </button>
          <button type="button" onClick={() => save(false)} disabled={busy} className="btn btn-pill text-xs gap-1.5">
            <Save className="w-3.5 h-3.5" /> Simpan draf
          </button>
          <button type="button" onClick={() => save(true)} disabled={busy} className="btn btn-cta btn-pill text-xs gap-1.5">
            <Send className="w-3.5 h-3.5" /> {editingId ? 'Simpan & tayangkan' : 'Kirim ke semua'}
          </button>
        </div>

        {preview && (
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle">
            <AnnouncementCard announcement={{ ...draft, ctaLabel: draft.ctaLabel || null, ctaUrl: draft.ctaUrl || null }} />
          </div>
        )}
      </div>

      {/* Riwayat */}
      <div className="space-y-2 pt-2 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <span className={LABEL}>Riwayat ({list.length})</span>
          <button type="button" onClick={() => void refresh()} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary" aria-label="Muat ulang">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {list.length === 0 && !loading && <p className="text-xs text-text-muted">Belum ada pengumuman.</p>}
        <ul className="space-y-2">
          {list.map(a => {
            const st = statusOf(a);
            return (
              <li key={a.id} className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary break-words">{a.title}</p>
                    <p className="text-[10px] text-text-muted">
                      <span className={`font-bold ${st.tone}`}>{st.label}</span> · {KIND_META[a.kind].label} · {fmt(a.startsAt)}
                      {a.endsAt && ` → ${fmt(a.endsAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button type="button" onClick={() => edit(a)} disabled={busy} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary" aria-label="Edit" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublish(a)}
                      disabled={busy}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                      aria-label={a.isPublished ? 'Tarik' : 'Tayangkan'}
                      title={a.isPublished ? 'Tarik (jadikan draf)' : 'Tayangkan'}
                    >
                      {a.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" onClick={() => remove(a)} disabled={busy} className="p-1.5 rounded-lg text-text-muted hover:text-wine-accent" aria-label="Hapus" title="Hapus">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
