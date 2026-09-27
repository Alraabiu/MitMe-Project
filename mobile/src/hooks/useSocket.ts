import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

/**
 * Returns a connected socket for the current user.
 * Reconnects automatically when the user logs back in.
 */
export function useSocket(): Socket | null {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setSocket(null);
      return;
    }

    (async () => {
      const s = await getSocket();
      if (!cancelled) setSocket(s);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return socket;
}
