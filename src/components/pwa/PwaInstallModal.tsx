import React, { useState } from 'react';
import { Smartphone, Laptop, Share2, PlusSquare, Download, Check, X } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstalled?: () => void;
  soundEnabled?: boolean;
}

type DeviceTab = 'ios' | 'android' | 'desktop';

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstalled,
  soundEnabled = true,
}) => {
  const [deviceTab, setDeviceTab] = useState<DeviceTab>(() => {
    if (typeof window === 'undefined') return 'android';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      return 'ios';
    }
    if (/Android/.test(ua)) {
      return 'android';
    }
    return 'desktop';
  });

  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleNativePrompt = async () => {
    playSound('click', soundEnabled);
    const prompt = deferredPrompt || (window as any).__pwaInstallPrompt;
    if (prompt && typeof prompt.prompt === 'function') {
      try {
        setIsInstalling(true);
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          playSound('fanfare', soundEnabled);
          if (onInstalled) onInstalled();
          onClose();
        }
      } catch (e) {
        console.warn('PWA install prompt error:', e);
      } finally {
        setIsInstalling(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 animate-fade-in">
      <div 
        className="panel panel-stitched w-full max-w-lg overflow-hidden relative shadow-2xl border border-border-primary text-text-primary animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-elevated/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-surface-inset border border-border-subtle text-indigo flex items-center justify-center shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-text-primary flex items-center gap-1.5">
                Pasang Aplikasi SevnQuest
              </h2>
              <p className="text-[11px] sm:text-xs text-text-secondary">
                Pengalaman aplikasi penuh tanpa bar URL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Native Install Button if available */}
          {Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt)) && (
            <div className="p-3.5 rounded-2xl bg-indigo/10 border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm">
              <div>
                <div className="text-xs font-bold text-indigo font-heading flex items-center gap-1.5 justify-center sm:justify-start">
                  <Check className="w-3.5 h-3.5 text-state-success" /> Perangkat Siap Mendukung Instalasi
                </div>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Klik tombol untuk langsung memunculkan dialog pasang sistem.
                </p>
              </div>

              <button
                type="button"
                disabled={isInstalling}
                onClick={handleNativePrompt}
                className="btn btn-primary text-xs gap-1.5 py-2 px-4 shrink-0 font-bold"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? 'Memproses...' : 'Pasang Sekarang'}</span>
              </button>
            </div>
          )}

          {/* Platform Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-surface-inset rounded-xl border border-border-subtle">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                setDeviceTab('ios');
              }}
              className={`flex-1 py-2 px-2 text-xs font-bold font-heading rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                deviceTab === 'ios'
                  ? 'bg-surface-elevated text-indigo shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span>🍎 iPhone / iPad</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                setDeviceTab('android');
              }}
              className={`flex-1 py-2 px-2 text-xs font-bold font-heading rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                deviceTab === 'android'
                  ? 'bg-surface-elevated text-indigo shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <span>🤖 Android</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                setDeviceTab('desktop');
              }}
              className={`flex-1 py-2 px-2 text-xs font-bold font-heading rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                deviceTab === 'desktop'
                  ? 'bg-surface-elevated text-indigo shadow-sm border border-border-subtle'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Komputer</span>
            </button>
          </div>

          {/* Guide Content: iOS Safari */}
          {deviceTab === 'ios' && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="p-2.5 rounded-xl bg-gold/10 border border-border-subtle text-gold-soft text-[11px] font-medium flex items-center gap-2">
                <span>ℹ️</span>
                <span>Di iOS, pastikan Anda membuka tautan di browser resmi <strong>Safari</strong>.</span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Ketuk tombol Bagikan (Share)</p>
                    <p className="text-text-secondary text-[11px] flex items-center gap-1">
                      Ketuk ikon kotak berpanah ke atas <Share2 className="w-3.5 h-3.5 text-indigo inline" /> di bilah navigasi bawah Safari.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Pilih &quot;Tambah ke Layar Utama&quot;</p>
                    <p className="text-text-secondary text-[11px] flex items-center gap-1">
                      Gulir menu ke bawah lalu ketuk <PlusSquare className="w-3.5 h-3.5 text-gold inline" /> <strong>&quot;Tambah ke Layar Utama&quot; (Add to Home Screen)</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    3
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Ketuk &quot;Tambah&quot; di sudut kanan atas</p>
                    <p className="text-text-secondary text-[11px]">
                      Ikon SevnQuest akan langsung muncul di beranda iPhone / iPad Anda layaknya aplikasi App Store!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guide Content: Android */}
          {deviceTab === 'android' && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Buka Menu Browser (⋮)</p>
                    <p className="text-text-secondary text-[11px]">
                      Ketuk ikon menu titik tiga di sudut kanan atas Google Chrome atau browser pilihan Anda.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Pilih &quot;Instal Aplikasi&quot;</p>
                    <p className="text-text-secondary text-[11px]">
                      Pilih opsi <strong>&quot;Pasang Aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    3
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Konfirmasi Pemasangan</p>
                    <p className="text-text-secondary text-[11px]">
                      Ketuk &quot;Instal&quot;. Aplikasi akan langsung siap dimainkan di layar utama tanpa batas URL browser!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guide Content: Desktop */}
          {deviceTab === 'desktop' && (
            <div className="space-y-3 animate-fade-in text-xs">
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    1
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Periksa Bilah Alamat (URL Bar)</p>
                    <p className="text-text-secondary text-[11px]">
                      Pada Google Chrome atau Microsoft Edge, perhatikan sisi kanan kolom URL tempat Anda mengetik alamat web.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    2
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Klik Ikon &quot;Pasang / Install&quot;</p>
                    <p className="text-text-secondary text-[11px]">
                      Klik ikon komputer kecil bertanda panah ke bawah atau opsi &quot;Pasang SevnQuest&quot;.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-surface-elevated text-indigo font-bold flex items-center justify-center text-xs shrink-0 border border-border-subtle">
                    3
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-text-primary">Aplikasi Siap di Desktop</p>
                    <p className="text-text-secondary text-[11px]">
                      SevnQuest akan memiliki jendela aplikasi sendiri, terdaftar di Start Menu / Launchpad, dan performa lebih cepat!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Info Pill */}
          <div className="p-3 rounded-xl bg-surface-inset/60 border border-border-subtle text-[11px] text-text-secondary flex items-center gap-2">
            <Check className="w-4 h-4 text-state-success shrink-0" />
            <span>Tanpa unduhan file APK atau App Store. Hemat kuota dan otomatis selalu diperbarui ke versi terbaru.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-elevated/40 flex justify-end">
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="btn btn-pill text-xs py-2 px-5 font-bold"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
