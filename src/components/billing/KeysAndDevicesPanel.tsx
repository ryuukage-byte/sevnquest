import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Copy, Check, MonitorSmartphone, Trash2 } from 'lucide-react';
import { useAccess } from '../../state/entitlement';
import {
  billingErrorMessage, listMyAccessKeys, redeemAccessKey, registerDevice, removeDevice, type AccessKey, type DeviceInfo,
} from '../../lib/billing';
import { formatIdr } from '../../utils/access';
import { getDeviceId, getDeviceLabel } from '../../utils/device';
import { playSound } from '../../utils/audio';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const keyLabel = (k: Pick<AccessKey, 'kind' | 'amount_idr'>) =>
  `${k.kind === 'lifetime' ? 'Setoran lifetime' : 'Donasi bulanan'} ${formatIdr(k.amount_idr)}`;

/** Pengaturan: tukar key, daftar key milik sendiri, dan perangkat yang login. */
export const KeysAndDevicesPanel: React.FC<{ soundEnabled?: boolean; showKeys?: boolean }> = ({ soundEnabled = true, showKeys = true }) => {
  const { refresh } = useAccess();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    listMyAccessKeys().then(setKeys).catch(() => setKeys([]));
    registerDevice(getDeviceId(), getDeviceLabel()).then(r => setDevices(r.devices)).catch(() => setDevices([]));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const redeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await redeemAccessKey(code);
      setMsg({ ok: true, text: `Key ${res.code} berhasil dipakai: ${keyLabel(res)}.` });
      setCode('');
      playSound('fanfare', soundEnabled);
      void refresh(true);
      void load();
    } catch (err) {
      setMsg({ ok: false, text: billingErrorMessage(err) });
      playSound('wrong', soundEnabled);
    } finally {
      setBusy(false);
    }
  };

  const unlink = async (d: DeviceInfo) => {
    if (!window.confirm(`Keluarkan perangkat "${d.label || 'Perangkat'}" dari akun ini?`)) return;
    try {
      await removeDevice(d.device_id);
      setDevices(prev => prev.filter(x => x.device_id !== d.device_id));
    } catch (err) {
      setMsg({ ok: false, text: billingErrorMessage(err) });
    }
  };

  const giftKeys = keys.filter(k => k.as_gift);

  return (
    <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md text-xs">
      {/* Tukar key (hanya bila monetisasi ditampilkan) */}
      {showKeys && (<>
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <KeyRound className="w-4 h-4 text-gold" /> Tukar Key
        </h3>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="SQ-XXXX-XXXX-XXXX"
            className="flex-1 min-w-0 bg-surface-inset border border-border-subtle rounded-xl px-3 py-2.5 font-mono text-sm text-text-primary focus:outline-none focus:border-border-primary"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button
            disabled={busy || !code.trim()}
            onClick={redeem}
            className="btn-cta px-4 py-2.5 text-xs font-heading font-black flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Tukar
          </button>
        </div>
        {msg && <p className={msg.ok ? 'text-emerald-400' : 'text-rose-400'}>{msg.text}</p>}
        <p className="text-text-muted">Key hanya bisa dipakai sekali dan terkunci ke akun yang menukarnya.</p>
      </div>

      {showKeys && giftKeys.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-bold text-text-secondary">Key hadiah milikmu</div>
          {giftKeys.map(k => (
            <div key={k.code} className="flex items-center gap-2 p-2 rounded-xl border border-border-subtle bg-surface-inset">
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold text-text-primary">{k.code}</div>
                <div className="text-[10px] text-text-muted">{keyLabel(k)} · {k.redeemed ? 'sudah dipakai' : 'belum dipakai'}</div>
              </div>
              {!k.redeemed && (
                <button
                  onClick={async () => { try { await navigator.clipboard.writeText(k.code); setCopied(k.code); setTimeout(() => setCopied(null), 1500); } catch { /* */ } }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary"
                  title="Salin key"
                >
                  {copied === k.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      </>)}

      {/* Perangkat (batas sengaja tidak ditampilkan) */}
      <div className="space-y-1.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <MonitorSmartphone className="w-4 h-4 text-indigo" /> Perangkat yang login
        </h3>
        {devices.map(d => (
          <div key={d.device_id} className="flex items-center gap-2 p-2 rounded-xl border border-border-subtle bg-surface-inset">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-text-primary truncate">
                {d.label || 'Perangkat'} {d.current && <span className="text-[10px] font-normal text-emerald-400">(perangkat ini)</span>}
              </div>
              <div className="text-[10px] text-text-muted">Terakhir aktif {fmt(d.last_seen)}</div>
            </div>
            {!d.current && (
              <button onClick={() => unlink(d)} className="p-1.5 rounded-lg text-text-muted hover:text-rose-400" title="Keluarkan perangkat">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
