import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { User } from '../types';

export interface ParticipantState {
  user: User;
  muted: boolean;
  camera: boolean;
  hand: boolean;
  share: boolean;
  isSelf: boolean;
}

interface RawParticipant {
  _id: string;
  user: User;
  role?: string;
  joinedAt?: string;
}

interface StateEvent {
  userId: string;
  type: 'media' | 'hand' | 'share' | string;
  value: any;
}

/**
 * Tracks everyone in the meeting room and their live state
 * (muted, camera, hand raised, sharing) via Socket.IO.
 */
export function useMeetingParticipants(
  socket: Socket,
  meetingId: string,
  self: User
): ParticipantState[] {
  const [participants, setParticipants] = useState<Record<string, ParticipantState>>({});

  // Seed the local user
  useEffect(() => {
    setParticipants((prev) => ({
      ...prev,
      [self._id]: prev[self._id] ?? {
        user: self,
        muted: true,
        camera: false,
        hand: false,
        share: false,
        isSelf: true,
      },
    }));
  }, [self]);

  useEffect(() => {
    if (!socket || !meetingId) return;

    const onParticipant = (p: RawParticipant | null) => {
      if (!p || !p.user) return;
      setParticipants((prev) => ({
        ...prev,
        [p.user._id]: prev[p.user._id] ?? {
          user: p.user,
          muted: false,
          camera: false,
          hand: false,
          share: false,
          isSelf: p.user._id === self._id,
        },
      }));
    };

    const onLeft = ({ userId }: { userId: string }) => {
      setParticipants((prev) => {
        if (userId === self._id) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const onState = (payload: StateEvent) => {
      setParticipants((prev) => {
        const existing = prev[payload.userId];
        if (!existing) return prev;
        const updated = { ...existing };
        switch (payload.type) {
          case 'media':
            updated.muted = !!payload.value?.muted;
            updated.camera = !!payload.value?.camera;
            break;
          case 'hand':
            updated.hand = !!payload.value;
            break;
          case 'share':
            updated.share = !!payload.value;
            break;
        }
        return { ...prev, [payload.userId]: updated };
      });
    };

    socket.on('meeting:participant', onParticipant);
    socket.on('meeting:participant-left', onLeft);
    socket.on('meeting:state', onState);

    return () => {
      socket.off('meeting:participant', onParticipant);
      socket.off('meeting:participant-left', onLeft);
      socket.off('meeting:state', onState);
    };
  }, [socket, meetingId, self._id]);

  return Object.values(participants);
}
