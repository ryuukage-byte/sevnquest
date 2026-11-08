import { useCallback, useEffect, useState } from 'react';
import { playSound } from '../utils/audio';

type PwaWindow = Window & { __pwaInstallPrompt?: any };

/** Prompt instalasi yang ditangkap di index.html (beforeinstallprompt), bila ada. */
const readGlobalPrompt = (): any => {
  if (typeof window === 'undefined') return null;
  return (window as PwaWindow).__pwaInstallPrompt || null;
};

const detectStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

/**
 * Status pemasangan PWA: prompt native, status sudah terpasang, dan panduan manual.
 * Dipakai oleh Dashboard (HomeView) sebagai satu-satunya tombol "Pasang App".
 */
export function usePwaInstall(soundEnabled: boolean) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(readGlobalPrompt);
  const [isStandalone, setIsStandalone] = useState<boolean>(detectStandalone);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    // Prompt mungkin sudah tertangkap sebelum komponen ini dipasang.
    const syncFromGlobal = () => {
      const prompt = readGlobalPrompt();
      if (prompt) setDeferredPrompt(prompt);
    };

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as PwaWindow).__pwaInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as PwaWindow).__pwaInstallPrompt = null;
      setIsStandalone(true);
    };

    syncFromGlobal();
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', syncFromGlobal);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', syncFromGlobal);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const markInstalled = useCallback(() => setIsStandalone(true), []);

  const handleInstallClick = useCallback(async () => {
    playSound('click', soundEnabled);
    const prompt = deferredPrompt || readGlobalPrompt();

    if (prompt && typeof prompt.prompt === 'function') {
      try {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          playSound('fanfare', soundEnabled);
          setDeferredPrompt(null);
          (window as PwaWindow).__pwaInstallPrompt = null;
          setIsStandalone(true);
        }
        return;
      } catch (err) {
        console.debug('Native prompt error, fallback to guide modal', err);
      }
    }

    // Fallback: panduan pemasangan khusus perangkat.
    setShowInstallGuide(true);
  }, [deferredPrompt, soundEnabled]);

  return {
    deferredPrompt,
    isStandalone,
    markInstalled,
    showInstallGuide,
    setShowInstallGuide,
    handleInstallClick,
  };
}
