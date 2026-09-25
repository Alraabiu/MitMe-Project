import { useCallback, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

type RefObject<T> = { readonly current: T | null };

export interface MeetingMediaState {
  stream: MediaStream | null;
  muted: boolean;
  camera: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  toggleMic: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  stopAll: () => void;
}

/**
 * Manages the local user's audio/video stream and broadcasts state
 * changes to the meeting room via Socket.IO.
 */
export function useMeetingMedia(
  meetingId: string,
  socket: Socket
): MeetingMediaState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(true);
  const [camera, setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ensureStream = useCallback(async (): Promise<MediaStream> => {
    if (stream) return stream;
    const s = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setStream(s);
    if (videoRef.current) videoRef.current.srcObject = s;
    return s;
  }, [stream]);

  const toggleMic = useCallback(async () => {
    try {
      const s = await ensureStream();
      const track = s.getAudioTracks()[0];
      if (!track) return;
      const next = !muted;
      track.enabled = !next;
      setMuted(next);
      socket.emit('meeting:state', {
        meetingId,
        type: 'media',
        value: { muted: next, camera },
      });
    } catch {
      alert('Microphone permission was denied.');
    }
  }, [ensureStream, muted, camera, meetingId, socket]);

  const toggleCamera = useCallback(async () => {
    try {
      const s = await ensureStream();
      const track = s.getVideoTracks()[0];
      if (!track) return;
      const next = !camera;
      track.enabled = next;
      setCamera(next);
      socket.emit('meeting:state', {
        meetingId,
        type: 'media',
        value: { muted, camera: next },
      });
    } catch {
      alert('Camera permission was denied.');
    }
  }, [ensureStream, muted, camera, meetingId, socket]);

  const stopAll = useCallback(() => {
    stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    setStream(null);
    setCamera(false);
    setMuted(true);
  }, [stream]);

  return { stream, muted, camera, videoRef, toggleMic, toggleCamera, stopAll };
}