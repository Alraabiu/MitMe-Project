import { useCallback, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import {
  RoomEvent,
  DataPacket_Kind,
  type RemoteParticipant,
} from 'livekit-client';

// ─── Environment detection ──────────────────────────────────
const isExpoGo = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LiveKit: any = null;
if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LiveKit = require('@livekit/react-native');
  } catch (err) {
    console.warn('[MitMe] LiveKit native module unavailable in chat hook:', err);
  }
}

// Safe fallback so hooks don't crash in Expo Go
const useRoomContext: () => any =
  LiveKit?.useRoomContext ?? (() => null);

// ─── Types ──────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  isOwn: boolean;
}

/**
 * Topic name matches LiveKit's built-in web `<Chat>` component
 * so web and mobile users see each other's messages.
 */
const CHAT_TOPIC = 'lk.chat';

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useMeetingChat() {
  const room = useRoomContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);

  // ─── Receive incoming messages ──────────────────────────
  useEffect(() => {
    if (!room) return;

    const onData = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      _kind?: DataPacket_Kind,
      topic?: string
    ) => {
      if (topic !== CHAT_TOPIC) return;

      try {
        const raw = new TextDecoder().decode(payload);
        let text = raw;
        try {
          const parsed = JSON.parse(raw);
          text = parsed?.message ?? raw;
        } catch {
          // Some clients send plain text; keep it.
        }

        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            text,
            sender:
              participant?.name ||
              participant?.identity ||
              'Participant',
            timestamp: Date.now(),
            isOwn: false,
          },
        ]);
        setUnread((n) => n + 1);
      } catch (err) {
        console.warn('[chat] bad payload:', err);
      }
    };

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  // ─── Send a message ─────────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!room || !trimmed) return;

      const payload = new TextEncoder().encode(
        JSON.stringify({ message: trimmed })
      );

      await room.localParticipant.publishData(payload, {
        reliable: true,
        topic: CHAT_TOPIC,
      });

      // LiveKit doesn't echo back to sender — add it locally.
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          text: trimmed,
          sender: 'You',
          timestamp: Date.now(),
          isOwn: true,
        },
      ]);
    },
    [room]
  );

  const markRead = useCallback(() => setUnread(0), []);

  return { messages, send, unread, markRead };
}