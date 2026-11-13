import React, { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone, Loader2, LogOut } from 'lucide-react';
import { registerDevice, removeDevice, type DeviceInfo } from '../../lib/billing';
import { getDeviceId, getDeviceLabel } from '../../utils/device';
import { signOut } from '../../lib/supabase';

/**
 * Daftarkan perangkat ini ke akun setelah login. Bila akun sudah dipakai di terlalu banyak perangkat,
 * tampilkan layar untuk mengeluarkan perangkat lama. Jumlah batas sengaja tidak disebutkan.
 * Gagal jaringan tidak memblokir (offline tetap bisa belajar).
 */
export const DeviceGate: React.FC<{ userId: string | null | undefined; children: React.ReactNode }> = ({ userId, children }) => {
  const [blocked, setBlocked] = useState(false);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await registerDevice(getDeviceId(), getDeviceLabel());
      setDevices(res.devices);
      setBlocked(!res.allowed);
    } catch (err) {
      console.warn('[device] gagal mendaftarkan perangkat, dilewati:', err);
      setBlocked(false);
    }
  }, [userId]);

  useEffect(() => { void check(); }, [check]);

  if (!blocked) return <>{children}</>;

  const unlink = async (d: DeviceInfo) => {
    setBusy(d.device_id);
    try {
      await removeDevice(d.device_id);
      await check();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-surface-base text-text-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md panel panel-stitched rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center">
            <MonitorSmartphone className="w-5 h-5 text-gold" />
          </div>
          <h2 className="font-heading font-black text-lg">Terlalu banyak perangkat</h2>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Akun ini sudah dipakai di banyak perangkat lain. Keluarkan salah satu perangkat lama untuk melanjutkan di perangkat ini.
          Progresmu tetap aman di akun.
        </p>
        <div className="space-y-2">
          {devices.filter(d => !d.current).map(d => (
            <div key={d.device_id} className="flex items-center gap-2 p-2.5 rounded-xl border border-border-subtle bg-surface-inset text-xs">
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{d.label || 'Perangkat'}</div>
                <div className="text-[10px] text-text-muted">
                  Terakhir aktif {new Date(d.last_seen).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                disabled={!!busy}
                onClick={() => unlink(d)}
                className="btn-physical-secondary px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {busy === d.device_id && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Keluarkan
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => { void signOut().then(() => window.location.reload()); }}
          className="w-full py-2.5 text-xs text-text-muted hover:text-text-primary flex items-center justify-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" /> Keluar dari akun
        </button>
      </div>
    </div>
  );
};
