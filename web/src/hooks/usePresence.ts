import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

/**
 * Tracks whether the user is actively using the web app.
 *
 * - Uses `document.visibilityState` (tab switch, minimize)
 * - Uses window `focus` / `blur` (window loses focus on desktop)
 * - Syncs the state to the backend via PATCH /users/me { presence }
 * - Returns a live `isOnline` boolean
 *
 * Behavior:
 *   active tab + focused window  → online
 *   hidden tab OR blurred window → offline
 */
export function usePresence(enabled: boolean) {
  const [isOnline, setIsOnline] = useState(true);
  const lastSent = useRef<'online' | 'offline' | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const pushPresence = (value: 'online' | 'offline') => {
      if (lastSent.current === value) return;
      lastSent.current = value;
      api.patch('/users/me', { presence: value }).catch(() => {
        // Allow retry next time if it failed
        lastSent.current = null;
      });
    };

    const compute = (): 'online' | 'offline' => {
      const visible = document.visibilityState === 'visible';
      const focused = document.hasFocus();
      return visible && focused ? 'online' : 'offline';
    };

    const sync = () => {
      const next = compute();
      setIsOnline(next === 'online');
      pushPresence(next);
    };

    // Sync immediately on mount
    setIsOnline(true);
    pushPresence('online');

    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    window.addEventListener('beforeunload', () => {
      // Fire-and-forget offline ping (using fetch keepalive so it survives)
      try {
        const apiUrl =
          (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env
            ?.VITE_API_URL || '';
        if (apiUrl) {
          const token =
            localStorage.getItem('mitme_access') || '';
          fetch(`${apiUrl}/users/me`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({ presence: 'offline' }),
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        /* ignore */
      }
    });

    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', sync);
      pushPresence('offline');
    };
  }, [enabled]);

  return isOnline;
}