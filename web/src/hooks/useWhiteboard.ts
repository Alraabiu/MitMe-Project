// React typings are unavailable in the current project configuration.
// @ts-ignore -- keep this hook usable until @types/react is installed.
import { useCallback, useEffect } from 'react';

type SetStateAction<T> = T | ((prevState: T) => T);
type Dispatch<T> = (value: T) => void;
import type { Socket } from 'socket.io-client';
import { api } from '../services/api';
import type { Whiteboard, WhiteboardEvent } from '../types';

export interface UseWhiteboardReturn {
  persistStroke: (points: { x: number; y: number }[]) => Promise<void>;
}

/**
 * Loads the meeting's whiteboard, keeps it in sync via Socket.IO,
 * and exposes a method to persist completed strokes.
 */
export function useWhiteboard(
  meetingId: string,
  socket: Socket,
  board: Whiteboard | null,
  setBoard: Dispatch<SetStateAction<Whiteboard | null>>
): UseWhiteboardReturn {
  // Initial load
  useEffect(() => {
    api
      .get<{ whiteboard: Whiteboard }>(`/whiteboards/${meetingId}`)
      .then((r) => setBoard(r.data.whiteboard))
      .catch(() => {});
  }, [meetingId, setBoard]);

  // Realtime sync
  useEffect(() => {
    const handler = (packet: { event: WhiteboardEvent }) => {
      setBoard((prev) => {
        if (!prev?.pages?.[0]) return prev;
        const copy: Whiteboard = JSON.parse(JSON.stringify(prev));
        copy.pages[0].events.push(packet.event);
        return copy;
      });
    };
    socket.on('whiteboard:event', handler);
    return () => {
      socket.off('whiteboard:event', handler);
    };
  }, [socket, setBoard]);

  const persistStroke = useCallback(
    async (points: { x: number; y: number }[]) => {
      if (points.length < 2) return;
      try {
        await api.post(`/whiteboards/${meetingId}/events`, {
          pageId: board?.pages?.[0]?._id,
          type: 'stroke',
          payload: { points },
        });
      } catch {
        /* network error — event still shows locally */
      }
    },
    [meetingId, board]
  );

  return { persistStroke };
}
