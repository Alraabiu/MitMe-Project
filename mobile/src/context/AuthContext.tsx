import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, rehydrateToken, setToken } from '../services/api';
import { disconnectSocket } from '../services/socket';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (access: string, refresh: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the current user from the backend.
   * Tolerates both response shapes:
   *   - { user: {...} }
   *   - { success: true, data: { user: {...} } }
   */
  const fetchMe = useCallback(async (): Promise<User | null> => {
    try {
      const r = await api.get('/auth/me');
      const payload = r?.data;
      const me = payload?.user ?? payload?.data?.user ?? null;
      return me ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await rehydrateToken();
        const token = await getToken();

        if (!token) {
          setLoading(false);
          return;
        }

        const me = await fetchMe();

        if (me) {
          setUser(me);
        } else {
          // Token was invalid / expired — clear everything
          await setToken(null, null);
          setUser(null);
        }
      } catch {
        await setToken(null, null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchMe]);

  const login = useCallback(
    async (access: string, refresh: string, newUser: User) => {
      await setToken(access, refresh);
      setUser(newUser);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore network errors on logout */
    }
    await setToken(null, null);
    disconnectSocket();
    setUser(null);
  }, []);

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchMe();
    if (me) setUser(me);
  }, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser, refreshUser }}
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