import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, ShieldAlert, Settings, BookOpen, User, LogOut, Coffee, MessageCircle, Sun, Moon, RefreshCw, Cloud, Check, Compass, Smartphone, Download, Play } from 'lucide-react';
import { PlayerStats } from '../../types/rpg';
import { speakJapanese, playSound } from '../../utils/audio';
import { signOut } from '../../lib/supabase';
import { PwaInstallModal } from '../pwa/PwaInstallModal';

interface SettingsViewProps {
  stats: PlayerStats;
  onUpdateSettings: (newSettings: Partial<PlayerStats>) => void;
  onResetData: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onSaveBeforeLogout?: () => Promise<void>;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string | null;
  onUpdateName?: (newName: string) => void;
  onReplayTutorial?: () => void;
}

function SettingSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 shrink-0 select-none cursor-pointer"
    >
      <span className={`text-xs font-bold w-14 text-right ${checked ? 'text-text-primary' : 'text-text-secondary'}`}>
        {checked ? 'Aktif' : 'Nonaktif'}
      </span>
      <span
        className={`relative w-12 h-7 rounded-full border transition-colors ${
          checked ? 'bg-surface-elevated border-gold/60' : 'bg-surface-inset border-border-primary'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-150 shadow-md ${
            checked ? 'translate-x-5 bg-gold' : 'translate-x-0 bg-text-muted'
          }`}
        />
      </span>
    </button>
  );
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  stats,
  onUpdateSettings,
  onResetData,
  isAuthenticated,
  onOpenAuth,
  onSaveBeforeLogout,
  syncStatus = 'idle',
  lastSyncedAt,
  onUpdateName,
  onReplayTutorial,
}) => {
  const [playerNameInput, setPlayerNameInput] = useState(stats.playerName || '');
  const [isNameSaved, setIsNameSaved] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      return (window as any).__pwaInstallPrompt || null;
    }
    return null;
  });
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).__pwaInstallPrompt);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePromptReady = () => {
      if ((window as any).__pwaInstallPrompt) {
        setDeferredPrompt((window as any).__pwaInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as any).__pwaInstallPrompt = null;
      }
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    playSound('click', stats.soundEnabled);
    const prompt = deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt);

    if (prompt && typeof prompt.prompt === 'function') {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          playSound('fanfare', stats.soundEnabled);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__pwaInstallPrompt = null;
          }
          setIsStandalone(true);
        }
        return;
      } catch (err) {
        console.debug('Native prompt error, fallback to guide modal', err);
      }
    }

    // Fallback: Show interactive device-specific installation guide
    setShowInstallGuide(true);
  };

  useEffect(() => {
    if (stats.playerName) {
      setPlayerNameInput(stats.playerName);
    }
  }, [stats.playerName]);

  const handleSaveName = () => {
    const trimmed = playerNameInput.trim();
    if (!trimmed) return;
    if (onUpdateName) {
      onUpdateName(trimmed);
    } else {
      onUpdateSettings({ playerName: trimmed });
    }
    playSound('correct', stats.soundEnabled);
    setIsNameSaved(true);
    setTimeout(() => setIsNameSaved(false), 2500);
  };

  const handleTestJapaneseVoice = () => {
    speakJapanese('こんにちは！日本語クエストRPGへようこそ。今日も一緒に日本語を勉強しましょう！');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-6">
      {/* Header */}
      <div className="panel panel-stitched p-4 flex items-center justify-between gap-3 shadow-md mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-indigo">
            <Settings className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-heading text-text-primary flex items-center gap-2">
              Pengaturan & Akun
            </h2>
            <p className="text-xs text-text-secondary">
              Kelola akun, pengaturan audio, dan preferensi belajar
            </p>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <User className="w-4 h-4 text-indigo" /> Akun SevnQuest
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {isAuthenticated ? (
            <>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle font-bold text-[10px] flex items-center gap-1.5 ${syncStatus === 'error' ? 'text-wine-accent' : 'text-indigo'}`}>
                    <Cloud className="w-3 h-3" />
                    {syncStatus === 'error' ? 'Sinkron gagal (progres lokal aman)' : 'Terhubung ke Cloud'}
                    {syncStatus === 'syncing' && (
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo ml-1" />
                    )}
                  </span>
                  {lastSyncedAt && (
                    <span className="text-[10px] text-text-muted">
                      Sinkron: {lastSyncedAt}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    playSound('click', true);
                    if (window.confirm('Keluar dari akun? Progres lokal akan disetel ulang (progres cloud aman).')) {
                      if (onSaveBeforeLogout) {
                        await onSaveBeforeLogout();
                      }
                      await signOut();
                      localStorage.removeItem('nihongo_quest_player_stats_v2');
                      localStorage.removeItem('nihongo_quest_stage_progress_v2');
                      localStorage.removeItem('nihongo_quest_daily_missions_v2');
                      localStorage.removeItem('nihongo_quest_weekly_missions_v2');
                      localStorage.removeItem('n3quest_last_cloud_sync');
                      window.location.reload();
                    }
                  }}
                  className="btn btn-pill text-xs gap-2 text-wine-accent"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-wine text-[10px] gap-1.5">
                    Mode Tamu (Guest)
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading mt-1.5">
                  Progres hanya tersimpan di perangkat ini
                </h4>
                <p className="text-xs text-text-secondary mt-1 max-w-sm">
                  Login dengan email untuk mengaktifkan Cloud Save otomatis agar level dan misimu tersinkronisasi di 2 HP atau perangkat lain!
                </p>
              </div>

              <button
                onClick={() => {
                  playSound('click', true);
                  onOpenAuth();
                }}
                className="btn btn-pill text-xs gap-2 shrink-0 text-indigo"
              >
                <User className="w-4 h-4" />
                Login / Daftar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile & Avatar Section */}
      <div className="panel panel-stitched p-4 sm:p-5 space-y-5 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <User className="w-4 h-4 text-indigo" /> Profil Pemain
        </h3>
        
        {/* 1. Nama Pemain / Panggilan */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-text-primary font-heading flex items-center justify-between">
            <span>Nama Petualang</span>
            <span className="text-[11px] text-text-secondary font-mono font-medium">
              {playerNameInput.length}/20 Karakter
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
                placeholder="Masukkan nama petualang..."
                className="w-full bg-surface-inset border border-border-subtle focus:border-border-primary rounded-xl px-3.5 py-2.5 text-sm font-bold font-heading text-text-primary outline-none transition-colors shadow-inner"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveName}
              disabled={!playerNameInput.trim() || playerNameInput.trim() === stats.playerName}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm select-none active:scale-95 shrink-0 ${
                isNameSaved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-border-subtle'
                  : playerNameInput.trim() && playerNameInput.trim() !== stats.playerName
                  ? 'btn-physical-primary font-black'
                  : 'bg-surface-inset text-text-muted border border-border-subtle cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isNameSaved ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          </div>
          <p className="text-[10px] text-text-secondary">
            *Nama ini akan tampil di Kartu Status Profil dan Peringkat Leaderboard.
          </p>
        </div>

        {/* 2. Tipe Karakter (Gender) */}
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <label className="text-xs sm:text-sm font-bold text-text-primary font-heading block">
            Tipe Karakter Petualang
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                playSound('click', stats.soundEnabled);
                onUpdateSettings({ characterGender: 'male' });
              }}
              className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                (stats.characterGender || 'male') === 'male'
                  ? 'bg-surface-elevated border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.35)]'
                  : 'bg-surface-inset border-border-subtle shadow-[inset_1px_1px_3px_var(--neu-d)] hover:border-border-muted opacity-75 hover:opacity-100'
              }`}
            >
              <span className="text-3xl">♂️</span>
              <div>
                <span className="text-xs sm:text-sm font-bold font-heading text-text-primary block">
                  Pendekar Pria
                </span>
                <span className="text-[11px] text-text-secondary font-body block mt-0.5">
                  Petualang ksatria pemberani
                </span>
              </div>
              {(stats.characterGender || 'male') === 'male' && (
                <span className="px-2 py-0.5 rounded-full bg-gold/20 border border-border-subtle text-[10px] font-bold text-gold shadow-xs">
                  Aktif
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click', stats.soundEnabled);
                onUpdateSettings({ characterGender: 'female' });
              }}
              className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                stats.characterGender === 'female'
                  ? 'bg-surface-elevated border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.35)]'
                  : 'bg-surface-inset border-border-subtle shadow-[inset_1px_1px_3px_var(--neu-d)] hover:border-border-muted opacity-75 hover:opacity-100'
              }`}
            >
              <span className="text-3xl">♀️</span>
              <div>
                <span className="text-xs sm:text-sm font-bold font-heading text-text-primary block">
                  Pendekar Wanita
                </span>
                <span className="text-[11px] text-text-secondary font-body block mt-0.5">
                  Petualang jubah tangguh
                </span>
              </div>
              {stats.characterGender === 'female' && (
                <span className="px-2 py-0.5 rounded-full bg-gold/20 border border-border-subtle text-[10px] font-bold text-gold shadow-xs">
                  Aktif
                </span>
              )}
            </button>
          </div>
          <p className="text-[10px] text-text-secondary">
            *Visual sprite avatar di Beranda dan Lembar Status akan otomatis menyesuaikan tingkatan (Tier) petualang.
          </p>
        </div>

        {/* 3. Avatar Picker */}
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <label className="text-xs sm:text-sm font-bold text-text-primary font-heading block">
            Pilih Avatar (Tampil di Leaderboard)
          </label>
          <div className="flex flex-wrap gap-2">
            {['🦊', '🐉', '⛩️', '👹', '🥷', '🌸', '⚔️', '👺', '🐼'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-pressed={(stats.avatar === emoji || (!stats.avatar && emoji === '🦊'))}
                aria-label={`Avatar ${emoji}`}
                onClick={() => {
                  playSound('click', true);
                  onUpdateSettings({ avatar: emoji });
                }}
                className={`ui-chip relative w-12 h-12 justify-center text-2xl ${
                  (stats.avatar === emoji || (!stats.avatar && emoji === '🦊')) ? 'is-active outline outline-2 outline-offset-2 outline-gold' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {emoji}
                {(stats.avatar === emoji || (!stats.avatar && emoji === '🦊')) && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold text-surface-base flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3" strokeWidth={3.5} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-secondary">
            *Avatar akan tersinkronisasi saat progress tersimpan ke cloud (saat EXP bertambah).
          </p>
        </div>
      </div>

      {/* Audio & Sound Effects Section */}
      <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <Volume2 className="w-4 h-4 text-indigo" /> Audio & Mantra Suara
        </h3>

        {/* Sound FX Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Efek Suara Game (SFX)</h4>
            <p className="text-xs text-text-secondary">Suara ketuk kayu, tebasan bambu, genta zen, tetesan air & lonceng angin</p>
          </div>
          <SettingSwitch
            checked={!!stats.soundEnabled}
            label="Efek Suara Game (SFX)"
            onChange={(newSetting) => {
              onUpdateSettings({ soundEnabled: newSetting });
              if (newSetting) playSound('click', true);
            }}
          />
        </div>

        {/* SFX Tester Pills */}
        {stats.soundEnabled && (
          <div className="pt-2 border-t border-border-subtle">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2 font-mono">
              Pratinjau Efek Suara — ketuk untuk memutar:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => playSound('click', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5"
              >
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                🪵 Ketuk Kayu
              </button>
              <button
                type="button"
                onClick={() => playSound('correct', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 text-emerald-600 dark:text-emerald-400"
              >
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                🔔 Genta Zen (Benar)
              </button>
              <button
                type="button"
                onClick={() => playSound('wrong', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 text-rose-600 dark:text-rose-400"
              >
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                🥁 Ketuk Lembut (Salah)
              </button>
              <button
                type="button"
                onClick={() => playSound('coin', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 text-gold"
              >
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                💧 Suikinkutsu (Koin)
              </button>
              <button
                type="button"
                onClick={() => playSound('attack', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 text-wine-accent"
              >
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                🎋 Tebasan Bambu
              </button>
              <button
                type="button"
                onClick={() => playSound('levelup', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 text-indigo"
              >
                <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                🎐 Fūrin (Level Up)
              </button>
            </div>
          </div>
        )}

        {/* Japanese TTS Voice Tester */}
        <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Uji Resonansi Suara Jepang (TTS)</h4>
            <p className="text-xs text-text-secondary">Menggunakan Web Speech Synthesis Native Browser</p>
          </div>
          <button
            onClick={handleTestJapaneseVoice}
            className="btn btn-pill text-xs gap-2 self-start sm:self-auto text-indigo"
          >
            <Volume2 className="w-4 h-4" />
            <span>Uji Suara 「こんにちは」</span>
          </button>
        </div>
      </div>

      {/* Learning Preferences */}
      <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 font-mono">
          <BookOpen className="w-4 h-4 text-indigo" />
          <span>Pengaturan Belajar</span>
        </h3>

        <div className="divide-y divide-border-subtle">
          {/* 1. Tema Visual */}
          <div className="py-3.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 pr-3">
              <h4 className="text-sm font-bold text-text-primary font-heading flex items-center gap-2 tracking-normal">
                <Sun className="w-4 h-4 text-indigo shrink-0" />
                <span>Tema Visual</span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Pilih Mode Gelap (Indigo Malam) atau Terang (Washi Hangat)
              </p>
            </div>
            <div className="shrink-0 inline-flex items-center p-1 rounded-xl bg-surface-inset border border-border-subtle shadow-inner">
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ theme: 'dark' });
                  playSound('click', stats.soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  stats.theme !== 'light'
                    ? 'bg-surface-elevated text-gold border border-border-subtle shadow-[0_2px_4px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Gelap</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ theme: 'light' });
                  playSound('click', stats.soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer select-none ${
                  stats.theme === 'light'
                    ? 'bg-surface-card text-indigo border border-border-primary/80 shadow-[0_2px_4px_var(--neu-d),inset_0_1px_0_rgba(255,255,255,0.95)]'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Terang</span>
              </button>
            </div>
          </div>

          {/* 2. Bantuan Furigana & Kanji */}
          <div className="py-3.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 pr-3">
              <h4 className="text-sm font-bold text-text-primary font-heading flex items-center gap-2 tracking-normal">
                <BookOpen className="w-4 h-4 text-indigo shrink-0" />
                <span>Bantuan Furigana & Kanji</span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Tampilkan cara baca Hiragana di atas huruf Kanji
              </p>
            </div>
            <SettingSwitch
              checked={stats.furiganaEnabled ?? true}
              label="Bantuan Furigana & Kanji"
              onChange={(next) => {
                onUpdateSettings({ furiganaEnabled: next });
                playSound('click', stats.soundEnabled);
              }}
            />
          </div>

          {/* 3. Panduan Awal (Tutorial) */}
          <div className="py-3.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 pr-3">
              <h4 className="text-sm font-bold text-text-primary font-heading flex items-center gap-2 tracking-normal">
                <Compass className="w-4 h-4 text-indigo shrink-0" />
                <span>Panduan Awal (Tutorial)</span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Ulangi tur panduan spotlight interaktif
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playSound('click', stats.soundEnabled);
                if (onReplayTutorial) onReplayTutorial();
              }}
              className="btn-physical-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none transition-all text-amber-900 dark:text-gold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Tur</span>
            </button>
          </div>

          {/* 4. Aplikasi Web (PWA) */}
          <div className="py-3.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 pr-3">
              <h4 className="text-sm font-bold text-text-primary font-heading flex items-center gap-2 tracking-normal">
                <Smartphone className="w-4 h-4 text-indigo shrink-0" />
                <span>Aplikasi Web (PWA)</span>
              </h4>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Pasang di layar utama HP / desktop tanpa bar URL
              </p>
            </div>
            {isStandalone ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-border-subtle text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0 whitespace-nowrap shadow-sm">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Terpasang</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="btn-physical-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none transition-all text-indigo cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pasang App</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Support & Community Section */}
      <div className="panel panel-stitched p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <MessageCircle className="w-4 h-4 text-indigo" /> Dukungan & Komunitas
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://teer.id/sevnsoul"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('click')}
            className="flex-1 py-3 px-4 rounded-xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle hover:border-border-primary flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
          >
            <Coffee className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-xs font-bold text-text-primary font-heading">Dukung Developer</div>
              <div className="text-[10px] text-text-muted">via Trakteer (teer.id)</div>
            </div>
          </a>

          <a
            href="https://ngl.link/sevnsouls"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('click')}
            className="flex-1 py-3 px-4 rounded-xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle hover:border-border-primary flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
          >
            <MessageCircle className="w-5 h-5 text-indigo group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-xs font-bold text-text-primary font-heading">Call Center / Lapor Bug</div>
              <div className="text-[10px] text-text-muted">via NGL Link (ngl.link/sevnsouls)</div>
            </div>
          </a>
        </div>
      </div>

      {/* Reset Progress Section */}
      <div className="panel panel-stitched p-4 sm:p-5 space-y-3 border border-border-subtle shadow-md">
        <div className="flex items-center gap-2 text-wine-accent font-bold text-xs sm:text-sm font-heading">
          <ShieldAlert className="w-4 h-4" />
          <span>Zona Riset Data</span>
        </div>
        <p className="text-xs text-text-secondary">
          Mereset EXP, level, gold, dan kemajuan stage kembali ke Tier 1 (Villager).
        </p>
        <button
          onClick={() => {
            if (window.confirm('Yakin ingin mereset seluruh progres petualangan?')) {
              onResetData();
            }
          }}
          className="btn btn-pill text-xs gap-1.5 text-wine-accent"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Progres Petualangan</span>
        </button>
      </div>

      {/* PWA Installation Guide Modal */}
      <PwaInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        deferredPrompt={deferredPrompt || (typeof window !== 'undefined' && (window as any).__pwaInstallPrompt)}
        onInstalled={() => setIsStandalone(true)}
        soundEnabled={stats.soundEnabled}
      />
    </div>
  );
};
