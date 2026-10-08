import { useCallback, useState } from 'react';

/** Toast singkat (satu pesan sekaligus) yang ditampilkan di bagian atas layar. */
export function useToast() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string, ms = 4000) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), ms);
  }, []);

  return { toastMessage, showToast };
}
