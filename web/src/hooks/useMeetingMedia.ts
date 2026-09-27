import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

export interface MeetingMediaState {
  stream: MediaStream | null;
  muted: boolean;
  camera: boolean;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  stopAll: () => void;
}

export function useMeetingMedia(
  meetingId: string,
  socket: Socket
): MeetingMediaState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(true);
  const [camera, setCamera] = useState(false);

  // Acquire media on mount ? both tracks disabled by default so the user
  // isn't "live" until they tap the buttons, but WebRTC has something to send.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        s.getAudioTracks().forEach((t) => (t.enabled = false));
        s.getVideoTracks().forEach((t) => (t.enabled = false));
        setStream(s);
      } catch (err) {
        console.warn('[media] getUserMedia failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMic = useCallback(async () => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    const next = !muted;
    track.enabled = !next;
    setMuted(next);
    socket.emit('meeting:state', {
      meetingId,
      type: 'media',
      value: { muted: next, camera },
    });
  }, [stream, muted, camera, meetingId, socket]);

  const toggleCamera = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const next = !camera;
    track.enabled = next;
    setCamera(next);
    socket.emit('meeting:state', {
      meetingId,
      type: 'media',
      value: { muted, camera: next },
    });
  }, [stream, muted, camera, meetingId, socket]);

  const stopAll = useCallback(() => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCamera(false);
    setMuted(true);
  }, [stream]);

  return { stream, muted, camera, toggleMic, toggleCamera, stopAll };
}
