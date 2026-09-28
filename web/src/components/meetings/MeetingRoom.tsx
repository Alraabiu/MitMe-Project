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

  // Leave on unmount
  useEffect(() => {
    return () => {
      api.post(`/meetings/${meeting._id}/leave`).catch(() => {});
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
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            Unable to join
          </div>
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
            onLeave={handleLeave}
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
 * Small overlay that shows connection state and a whiteboard toggle
 * on top of LiveKit's built-in control bar.
 */
function MeetingRoomExtras({
  meeting,
  onLeave,
  whiteboardOpen,
  setWhiteboardOpen,
}: {
  meeting: Meeting;
  onLeave: () => void;
  whiteboardOpen: boolean;
  setWhiteboardOpen: (v: boolean) => void;
}) {
  const connectionState = useConnectionState();

  return (
    <div className="meeting-overlay">
      <div className="meeting-overlay-top">
        <div className="meeting-overlay-info">
          <b>{meeting.title}</b>
          <span> · </span>
          <span style={{ color: '#aaa' }}>{meeting.code}</span>
        </div>
        <div
          className={`meeting-status ${
            connectionState === ConnectionState.Connected ? 'ok' : 'warn'
          }`}
        >
          {connectionState}
        </div>
      </div>

      <div className="meeting-overlay-actions">
        <button
          className={`meeting-tool ${whiteboardOpen ? 'active' : ''}`}
          onClick={() => setWhiteboardOpen(!whiteboardOpen)}
          title="Toggle whiteboard"
        >
          <PenTool size={18} />
        </button>
        <button
          className="meeting-tool meeting-tool-leave"
          onClick={onLeave}
          title="Leave meeting"
        >
          Leave
        </button>
      </div>
    </div>
  );
}