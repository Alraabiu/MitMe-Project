import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  darkColors,
  lightColors,
  darkGradients,
  lightGradients,
  darkShadows,
  lightShadows,
  type ThemePalette,
  type ThemeGradients,
  type ThemeShadows,
} from '../theme';

/* ============================================================
   TYPES
   ============================================================ */

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** Current effective palette (light or dark). */
  colors: ThemePalette;
  gradients: ThemeGradients;
  shadows: ThemeShadows;

  /** The user-selected mode. */
  mode: ThemeMode;

  /** True if the effective theme is dark. */
  isDark: boolean;

  /** Change the mode (persisted). */
  setMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'mitme_theme_mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/* ============================================================
   PROVIDER
   ============================================================ */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  /* Load stored preference on mount */
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch {
        /* ignore */
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {});
  }, []);

  /* Resolve system → actual */
  const isDark = useMemo(() => {
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [mode, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      gradients: isDark ? darkGradients : lightGradients,
      shadows: isDark ? darkShadows : lightShadows,
      mode,
      isDark,
      setMode,
    }),
    [isDark, mode, setMode]
  );

  /* Prevent flash of wrong theme on first render */
  if (!hydrated) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* ============================================================
   HOOK
   ============================================================ */

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}