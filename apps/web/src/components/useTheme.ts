import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'quorum-theme';

/** El tema inicial lo fija un script en index.html (preferencia guardada o del sistema). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? 'light',
  );

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // Sin almacenamiento disponible: el cambio dura hasta recargar.
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
