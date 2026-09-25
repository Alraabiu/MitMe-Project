import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { Message } from '../types';
import { useSound } from './useSound';

export interface Toast {
  id: string;
  conversationId: string;
  title: string;
  body: string;
}

interface Options {
  socket: Socket;
  currentUserId: string;
  activeConversationId?: string | null;
  messagesVisible?: boolean;
  /** Global mute toggle (default false) */
  muted?: boolean;
}

export function useMessageNotifications({
  socket,
  currentUserId,
  activeConversationId,
  messagesVisible,
  muted = false,
}: Options) {
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const activeRef = useRef(activeConversationId);
  const visibleRef = useRef(messagesVisible);
  const mutedRef = useRef(muted);
  const { play, unlock } = useSound();

  // Keep refs synced
  useEffect(() => {
    activeRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => {
    visibleRef.current = messagesVisible;
  }, [messagesVisible]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Unlock audio on first user gesture (required by browser autoplay policy)
  useEffect(() => {
    const unlockOnce = () => {
      unlock();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce, { once: true });
    window.addEventListener('keydown', unlockOnce, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
  }, [unlock]);

  // Request native notification permission
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const t = setTimeout(() => {
        Notification.requestPermission().catch(() => {});
      }, 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Listen for incoming messages
  useEffect(() => {
    const handler = (m: Message) => {
      // Never notify on our own messages
      if (m.sender?._id === currentUserId) return;

      const convId = m.conversation;
      const isActive =
        visibleRef.current && activeRef.current === convId;
      if (isActive) return;

      // 🔊 Play chime (unless muted)
      if (!mutedRef.current) {
        play('message');
      }

      setUnread((prev) => ({
        ...prev,
        [convId]: (prev[convId] || 0) + 1,
      }));

      const id = m._id;
      const title = m.sender?.displayName || 'New message';
      const body = m.text || '(attachment)';

      setToasts((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [...prev, { id, conversationId: convId, title, body }];
      });

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);

      if (
        document.hidden &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const n = new Notification(title, {
            body,
            icon: '/logo-mark.png',
            tag: convId,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        } catch {
          /* ignore */
        }
      }
    };

    socket.on('message:new', handler);
    return () => {
      socket.off('message:new', handler);
    };
  }, [socket, currentUserId, play]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearUnread = (conversationId: string) => {
    setUnread((prev) => {
      if (!prev[conversationId]) return prev;
      const copy = { ...prev };
      delete copy[conversationId];
      return copy;
    });
  };

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return { unread, totalUnread, toasts, dismissToast, clearUnread };
}
