import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useConnectionState,
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { PenTool, X } from 'lucide-react';
import { api } from '../../services/api';
import { WhiteboardPanel } from '../whiteboard/WhiteboardPanel';
import { getSocket } from '../../services/socket';
import type { Meeting, User, Whiteboard } from '../../types';

interface MeetingRoomProps {
  meeting: Meeting;
  user: User;
  onLeave: () => void;
}

interface MediaInfo {
  provider: string;
  mode: string;
  url: string | null;
  token: string | null;
}

export function MeetingRoom({ meeting, onLeave }: MeetingRoomProps) {
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [board, setBoard] = useState<Whiteboard | null>(null);

  const socket = getSocket();

  // Fetch the LiveKit token when the room mounts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.post<{ media: MediaInfo }>(
          `/meetings/${meeting._id}/join`
        );
        if (cancelled) return;
        setMedia(r.data.media);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message || 'Could not join the meeting.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meeting._id]);

  const handleLeave = () => {
    api.post(`/meetings/${meeting._id}/leave`).catch(() => {});
    onLeave();
  };

  if (loading) {
    return (
      <div className="meeting-livekit">
        <div className="meeting-loading">
          <div className="spinner" />
          <div>Connecting to the meeting…</div>
        </div>
      </div>
    );
  }

  if (error || !media?.token || !media?.url) {
    return (
      <div className="meeting-livekit">
        <div className="meeting-loading">
          <div style={{ fontSize: 18, fontWeight: 700 }}>Unable to join</div>
          <div style={{ marginTop: 8, color: '#aaa' }}>
            {error || 'LiveKit credentials were not provided.'}
          </div>
          <button
            className="btn primary"
            style={{ marginTop: 20 }}
            onClick={handleLeave}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-livekit">
      <div className="meeting-stage">
        <LiveKitRoom
          serverUrl={media.url}
          token={media.token}
          connect
          audio
          video
          onDisconnected={handleLeave}
          data-lk-theme="default"
          style={{ height: '100%', background: '#0e0c18' }}
        >
          <RoomAudioRenderer />
          <VideoConference />
          <MeetingRoomExtras
            meeting={meeting}
            whiteboardOpen={whiteboardOpen}
            setWhiteboardOpen={setWhiteboardOpen}
          />
        </LiveKitRoom>
      </div>

      {whiteboardOpen && (
        <aside className="panel">
          <div className="panel-header">
            <h2 style={{ margin: 0 }}>Collaborative whiteboard</h2>
            <button
              className="btn"
              style={{ padding: '6px 10px' }}
              onClick={() => setWhiteboardOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
          <WhiteboardPanel
            meetingId={meeting._id}
            socket={socket}
            board={board}
            setBoard={setBoard}
          />
          <p className="muted" style={{ marginTop: 12 }}>
            Changes are sent through Socket.IO and persisted in MongoDB.
          </p>
        </aside>
      )}
    </div>
  );
}

/**
 * Small non-blocking overlays:
 *  - top-left: meeting title + code
 *  - top-right: connection status pill
 *  - below that: whiteboard toggle button
 *
 * None of these overlap LiveKit's built-in control bar, so
 * Microphone / Camera / Share screen / Chat / Leave all stay clickable.
 */
function MeetingRoomExtras({
  meeting,
  whiteboardOpen,
  setWhiteboardOpen,
}: {
  meeting: Meeting;
  whiteboardOpen: boolean;
  setWhiteboardOpen: (v: boolean) => void;
}) {
  const connectionState = useConnectionState();

  return (
    <>
      {/* Top-left info */}
      <div className="meeting-info-pill">
        <b>{meeting.title}</b>
        <span style={{ color: '#aaa' }}> · {meeting.code}</span>
      </div>

      {/* Top-right status */}
      <div
        className={`meeting-status-pill ${
          connectionState === ConnectionState.Connected ? 'ok' : 'warn'
        }`}
      >
        {connectionState}
      </div>

      {/* Below status: whiteboard toggle */}
      <button
        className={`meeting-side-btn ${whiteboardOpen ? 'active' : ''}`}
        onClick={() => setWhiteboardOpen(!whiteboardOpen)}
        title="Toggle whiteboard"
      >
        <PenTool size={18} />
        <span>Whiteboard</span>
      </button>
    </>
  );
}