import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getThemeMode,
  setThemeMode,
  type ThemeMode,
} from '../services/theme';

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(() => getThemeMode());

  useEffect(() => {
    applyTheme();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    setModeState(next);
  }, []);

  return { mode, setMode };
}
