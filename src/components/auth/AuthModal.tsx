import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { mountGoogleButton, GOOGLE_CLIENT_ID } from '../../lib/googleIdentity';
import { Mail, Lock, Loader2, X, AlertCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  soundEnabled?: boolean;
  isMandatory?: boolean;
}

/** Tombol Google hanya tampil bila provider sudah aktif di Supabase (VITE_GOOGLE_AUTH=true) dan VITE_GOOGLE_CLIENT_ID diisi. */
const GOOGLE_AUTH_ENABLED =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_AUTH === 'true' &&
  !!GOOGLE_CLIENT_ID;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, soundEnabled = true, isMandatory = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(true);

  useEffect(() => {
    if (!isOpen || !GOOGLE_AUTH_ENABLED || !googleBtnRef.current) return;
    let cancelled = false;
    mountGoogleButton(googleBtnRef.current, (err) => {
      if (cancelled) return;
      if (err) {
        setError(
          /provider is not enabled|Unsupported provider/i.test(err)
            ? 'Login Google belum diaktifkan di server. Gunakan email & password untuk sementara.'
            : err
        );
        playSound('wrong', soundEnabled);
      } else {
        playSound('fanfare', soundEnabled);
        onSuccess();
      }
    }).then((ok) => {
      if (!cancelled) setGoogleReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    playSound('click', soundEnabled);

    try {
      const cleanEmail = email.trim();
      if (!isLogin && !cleanEmail.toLowerCase().endsWith('@gmail.com')) {
        throw new Error('Pendaftaran saat ini hanya diizinkan menggunakan akun @gmail.com');
      }

      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      } else {
        result = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
          },
        });
      }

      if (result.error) {
        throw result.error;
      }

      if (!isLogin && result.data?.user?.identities?.length === 0) {
        // Supabase returns this if the email is already registered during signup
        throw new Error('Email sudah terdaftar. Silakan beralih ke tab Login.');
      }

      if (!isLogin && !result.data?.session && result.data?.user) {
        // Confirmation email was sent by Supabase
        playSound('fanfare', soundEnabled);
        setSuccessMessage('Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi email lalu masuk (Login).');
        setIsLogin(true);
        return;
      }

      playSound('fanfare', soundEnabled);
      onSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.message || '';
      if (
        /Failed to fetch|Load failed|NetworkError|network request failed|aborted|timed? ?out/i.test(msg) ||
        err.name === 'TypeError' || err.name === 'AbortError' || err.name === 'AuthRetryableFetchError'
      ) {
        setError('Gagal terhubung ke server. Coba: (1) periksa koneksi internet, (2) ganti jaringan (WiFi ↔ data seluler) atau aktifkan DNS 1.1.1.1 / VPN karena sebagian provider memblokir server kami, (3) matikan AdBlock/Brave Shields untuk situs ini, lalu muat ulang halaman.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Email atau password salah. Silakan periksa kembali.');
      } else if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Email sudah terdaftar. Silakan beralih ke tab Login.');
      } else if (msg.includes('Password should be at least')) {
        setError('Password minimal harus 6 karakter.');
      } else if (msg.includes('Invalid API key') || msg.includes('apikey')) {
        setError('Koneksi server sedang disegarkan. Mohon refresh halaman browser (Ctrl+F5) lalu coba lagi.');
      } else if (msg.includes('Error sending confirmation email') || msg.includes('confirmation email')) {
        setError('Server Supabase gagal mengirim email verifikasi (limit SMTP tercapai). Solusi: Matikan opsi "Confirm email" di Supabase Dashboard (Authentication > Providers > Email) agar user bisa langsung daftar.');
      } else {
        setError(msg || 'Terjadi kesalahan saat proses autentikasi.');
      }
      playSound('wrong', soundEnabled);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-md panel panel-stitched bg-surface-card border border-border-subtle rounded-3xl overflow-hidden shadow-[6px_6px_24px_var(--neu-d),-4px_-4px_16px_var(--neu-l)] relative animate-in fade-in zoom-in duration-200">
        {/* Washi Texture Overlay */}
        <div className="skeuo-grain" />

        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-border-subtle bg-surface-inset/80 relative z-10 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-text-primary text-base sm:text-lg font-heading tracking-wide">
              {isLogin ? 'Masuk ke Akun' : 'Buat Akun Petualang'}
            </h2>
          </div>
          <button 
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="btn-physical-secondary w-8 h-8 rounded-xl transition-all flex items-center justify-center cursor-pointer p-0"
            title="Tutup / Lanjutkan tanpa login"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 sm:p-6 relative z-10 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/15 border border-border-subtle rounded-2xl text-rose-400 text-xs shadow-xs leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/15 border border-border-subtle rounded-2xl text-emerald-300 text-xs shadow-xs leading-relaxed">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          {GOOGLE_AUTH_ENABLED && googleReady && (<>
          <div ref={googleBtnRef} style={{ colorScheme: 'light' }} className="w-full flex justify-center min-h-[44px]" />

          <div className="flex items-center gap-3 text-[10px] text-text-muted uppercase tracking-wider">
            <span className="flex-1 h-px bg-border-subtle" />
            atau dengan email
            <span className="flex-1 h-px bg-border-subtle" />
          </div>
          </>)}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary ml-1 font-heading uppercase tracking-wider">Email (Gmail)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-inset border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary transition-all shadow-[inset_1.5px_1.5px_4px_var(--neu-d)]"
                  placeholder="nama@gmail.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-secondary ml-1 font-heading uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-inset border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary transition-all shadow-[inset_1.5px_1.5px_4px_var(--neu-d)]"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-cta w-full py-3.5 text-xs sm:text-sm font-heading font-black mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Masuk ke Akun' : 'Daftar Akun Baru'}
            </button>

            {!isMandatory && (
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                className="w-full py-2.5 text-xs text-text-muted hover:text-text-primary transition-colors text-center font-medium cursor-pointer"
              >
                Lanjut Belajar Tanpa Login (Mode Tamu)
              </button>
            )}
          </form>

          {/* Toggle Login / SignUp */}
          <div className="mt-4 pt-4 border-t border-border-subtle text-center text-xs text-text-secondary">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                playSound('click', soundEnabled);
              }}
              className="text-gold font-bold hover:underline cursor-pointer ml-1"
            >
              {isLogin ? 'Daftar Sekarang' : 'Masuk di Sini'}
            </button>
          </div>
          
          {!isLogin && (
            <p className="text-[10px] text-text-muted text-center mt-2 px-2">
              Akun akan menyinkronkan progres petualangan dan peringkat Leaderboard ke cloud secara aman.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
