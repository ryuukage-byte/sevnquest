import { useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'sqg_theme';

function initial(): Theme {
  try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}

/** Tema sama dengan SevnQuest: kelas `dark` / `theme-light` pada <html>. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    const root = document.documentElement;
    const light = theme === 'light';
    root.classList.toggle('theme-light', light);
    root.classList.toggle('dark', !light);
    root.style.colorScheme = light ? 'light' : 'dark';
    document.getElementById('meta-theme-color')?.setAttribute('content', light ? '#eae7de' : '#12151d');
    try { localStorage.setItem(KEY, theme); } catch { /* abaikan */ }
  }, [theme]);
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))];
}
