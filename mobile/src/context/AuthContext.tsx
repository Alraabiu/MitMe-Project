import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { api, getToken, rehydrateToken, setToken } from '../services/api';
import { disconnectSocket } from '../services/socket';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  presence: 'online' | 'offline';
  isOnline: boolean;
  login: (access: string, refresh: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Sanitize a user object from the backend.
 * Ensures critical fields exist so downstream code never crashes.
 */
function sanitizeUser(raw: any): User | null {
  if (!raw || typeof raw !== 'object' || !raw._id) return null;

  return {
    ...raw,
    _id: String(raw._id),
    displayName: String(raw.displayName || raw.username || 'User'),
    username: String(raw.username || 'user'),
    email: raw.email ? String(raw.email) : undefined,
    phone: raw.phone ? String(raw.phone) : undefined,
    avatarUrl: raw.avatarUrl ? String(raw.avatarUrl) : undefined,
    bio: raw.bio ? String(raw.bio) : undefined,
    role: raw.role || 'member',
    presence: raw.presence || 'offline',
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  const presence: 'online' | 'offline' = isOnline ? 'online' : 'offline';

  /* ─── Fetch current user ──────────────────────────── */

  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      const r = await api.get('/auth/me');
      const payload = r?.data;
      const me = payload?.user ?? payload?.data?.user ?? null;
      return sanitizeUser(me);
    } catch {
      return null;
    }
  }, []);

  /* ─── Bootstrap: rehydrate token + load user ──────── */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await rehydrateToken();
        const token = await getToken();

        if (!token) {
          if (!cancelled) setLoading(false);
          return;
        }

        const me = await fetchMe();
        if (cancelled) return;

        if (me) {
          setUser(me);
        } else {
          await setToken(null, null);
          setUser(null);
        }
      } catch (err) {
        console.warn('[Auth] bootstrap failed:', err);
        await setToken(null, null).catch(() => {});
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchMe]);

  /* ─── Live presence via AppState ──────────────────── */

  useEffect(() => {
    if (!user) {
      setIsOnline(false);
      return;
    }

    // Mark online immediately
    setIsOnline(true);
    api.patch('/users/me', { presence: 'online' }).catch(() => {});

    // Track foreground / background
    const handleChange = (next: AppStateStatus) => {
      const active = next === 'active';
      setIsOnline(active);
      api
        .patch('/users/me', { presence: active ? 'online' : 'offline' })
        .catch(() => {});
    };

    const sub = AppState.addEventListener('change', handleChange);

    return () => {
      sub.remove();
      api.patch('/users/me', { presence: 'offline' }).catch(() => {});
    };
  }, [user]);

  /* ─── Login ──────────────────────────────────────── */

  const login = useCallback(
    async (access: string, refresh: string, newUser: User) => {
      const clean = sanitizeUser(newUser);
      if (!clean) {
        throw new Error('Invalid user data returned from server.');
      }
      await setToken(access, refresh);
      setUser(clean);
    },
    []
  );

  /* ─── Logout ─────────────────────────────────────── */

  const logout = useCallback(async () => {
    try {
      await api.patch('/users/me', { presence: 'offline' });
    } catch {
      /* ignore */
    }
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    try {
      await setToken(null, null);
    } catch {
      /* ignore */
    }
    try {
      disconnectSocket();
    } catch {
      /* ignore */
    }
    setUser(null);
    setIsOnline(false);
  }, []);

  const updateUser = useCallback((newUser: User) => {
    const clean = sanitizeUser(newUser);
    if (clean) setUser(clean);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    if (me) setUser(me);
  }, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        presence,
        isOnline,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}