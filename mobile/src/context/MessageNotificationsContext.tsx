import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Vibration } from 'react-native';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from './AuthContext';
import {
  configureNotificationHandler,
  ensureNotificationPermission,
  setupAndroidChannel,
  showLocalNotification,
} from '../services/notifications';
import type { Message } from '../types';

interface NotificationsValue {
  unread: Record<string, number>;
  totalUnread: number;
  clearUnread: (conversationId: string) => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const Ctx = createContext<NotificationsValue | undefined>(undefined);

export function MessageNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socket = useSocket();
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [activeConversationId, setActiveConversationIdState] = useState<
    string | null
  >(null);

  const activeRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Configure the notification handler once (safe no-op if unavailable)
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Track app foreground/background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
    });
    return () => sub.remove();
  }, []);

  // One-time permission + channel setup
  useEffect(() => {
    if (!user) return;
    setupAndroidChannel();
    ensureNotificationPermission();
  }, [user]);

  useEffect(() => {
    activeRef.current = activeConversationId;
  }, [activeConversationId]);

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
    if (id) {
      setUnread((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  const clearUnread = useCallback((conversationId: string) => {
    setUnread((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket || !user) return;

    const handler = (m: Message) => {
      if (m.sender?._id === user._id) return; // our own
      if (activeRef.current === m.conversation) return; // user is viewing it

      // Increment unread
      setUnread((prev) => ({
        ...prev,
        [m.conversation]: (prev[m.conversation] || 0) + 1,
      }));

      const title = m.sender?.displayName || 'New message';
      const body = m.text || '(attachment)';

      // Foreground: vibrate (always works)
      try {
        Vibration.vibrate(80);
      } catch {
        /* ignore */
      }

      // Backgrounded: try native notification (works in dev builds)
      if (appStateRef.current !== 'active') {
        showLocalNotification(title, body, {
          conversationId: m.conversation,
        });
      }
    };

    socket.on('message:new', handler);
    return () => {
      socket.off('message:new', handler);
    };
  }, [socket, user]);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <Ctx.Provider
      value={{
        unread,
        totalUnread,
        clearUnread,
        activeConversationId,
        setActiveConversationId,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useMessageNotifications(): NotificationsValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      'useMessageNotifications must be used inside MessageNotificationsProvider'
    );
  }
  return ctx;
}
