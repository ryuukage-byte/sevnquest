import { useEffect } from 'react';

/** Sinkronkan kelas tema pada <html> dengan preferensi pemain. */
export function useTheme(theme: 'dark' | 'light' | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      root.classList.remove('theme-light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    }
  }, [theme]);
}
