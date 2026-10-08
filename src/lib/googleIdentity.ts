/**
 * Tombol "Sign in with Google" resmi (Google Identity Services). Popup menampilkan nama aplikasi/situs,
 * lalu ID token dikirim ke Supabase (signInWithIdToken). Client ID bersifat publik (bukan rahasia).
 */
import { signInWithGoogleIdToken } from './supabase';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GsiCredentialResponse { credential?: string }
interface GsiApi {
  accounts: {
    id: {
      initialize: (cfg: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
}

export const GOOGLE_CLIENT_ID: string =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_CLIENT_ID || '';

let gsiPromise: Promise<GsiApi> | null = null;

function loadGsi(): Promise<GsiApi> {
  const w = window as unknown as { google?: GsiApi };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  if (!gsiPromise) {
    gsiPromise = new Promise<GsiApi>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GSI_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => (w.google?.accounts?.id ? resolve(w.google) : reject(new Error('gsi-missing')));
      s.onerror = () => {
        gsiPromise = null;
        reject(new Error('gsi-load-failed'));
      };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Pasang tombol Google ke `container`. `onResult(null)` = berhasil masuk; string = pesan error.
 * Mengembalikan false bila tombol tidak dapat dipasang (Client ID kosong / skrip Google gagal dimuat).
 */
export async function mountGoogleButton(
  container: HTMLElement,
  onResult: (error: string | null) => void
): Promise<boolean> {
  if (!GOOGLE_CLIENT_ID || typeof crypto === 'undefined' || !crypto.subtle) return false;
  try {
    const gsi = await loadGsi();
    const nonce = randomNonce();
    const hashedNonce = await sha256Hex(nonce);
    gsi.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce: hashedNonce,
      use_fedcm_for_prompt: true,
      callback: async (resp: GsiCredentialResponse) => {
        if (!resp.credential) {
          onResult('Login Google dibatalkan.');
          return;
        }
        try {
          onResult(await signInWithGoogleIdToken(resp.credential, nonce));
        } catch {
          onResult('Gagal terhubung ke server. Periksa koneksi internet lalu coba lagi.');
        }
      },
    });
    container.innerHTML = '';
    gsi.accounts.id.renderButton(container, {
      type: 'standard',
      theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: Math.min(Math.max(container.clientWidth || 300, 200), 400),
    });
    return true;
  } catch {
    return false;
  }
}
