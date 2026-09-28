import { useEffect, useMemo, useState } from 'react';
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
import { WaitingRoom } from './WaitingRoom';
import { HostApprovalPanel } from './HostApprovalPanel';
import { getSocket } from '../../services/socket';
import { SelfView } from './SelfView';
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

type JoinState = 'loading' | 'pending' | 'admitted' | 'error';

export function MeetingRoom({ meeting, user, onLeave }: MeetingRoomProps) {
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [joinState, setJoinState] = useState<JoinState>('loading');
  const [error, setError] = useState('');
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [board, setBoard] = useState<Whiteboard | null>(null);
  const [admitRetry, setAdmitRetry] = useState(0);

  const socket = getSocket();

  // ─── Host detection ─────────────────────────────────────
  // meeting.host can be:
  //   - an ObjectId string (from POST /meetings or POST /meetings/:id/join)
  //   - a populated user object with _id (from GET /meetings list)
  const isHost = useMemo(() => {
    const hostId =
      typeof meeting.host === 'object' && meeting.host !== null
        ? (meeting.host as { _id?: string })._id
        : (meeting.host as unknown as string);

    if (String(hostId) === String(user._id)) return true;

    // Also treat teacher/admin as hosts for co-management
    if (user.role === 'teacher' || user.role === 'admin') return true;

    return false;
  }, [meeting.host, user._id, user.role]);

  // ─── Fetch LiveKit token (or fall into waiting room) ────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.post<{
          status?: 'pending' | 'admitted';
          media?: MediaInfo;
        }>(`/meetings/${meeting._id}/join`);

        if (cancelled) return;

        const status = r.data.status ?? 'admitted';

        if (status === 'pending') {
          setJoinState('pending');
          return;
        }

        setMedia(r.data.media ?? null);
        setJoinState('admitted');
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message || 'Could not join the meeting.'
        );
        setJoinState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meeting._id, admitRetry]);

  // ─── Join the socket room once admitted ─────────────────
  useEffect(() => {
    if (!socket || joinState !== 'admitted') return;
    socket.emit('meeting:join', meeting._id);
    return () => {
      socket.emit('meeting:leave', meeting._id);
    };
  }, [socket, meeting._id, joinState]);

  // ─── Listen for whiteboard open/close from other users ─
  useEffect(() => {
    if (!socket) return;
    const onState = (payload: {
      userId: string;
      type: string;
      value: any;
    }) => {
      if (payload.userId === user._id) return;
      if (payload.type === 'whiteboard') {
        setWhiteboardOpen(!!payload.value);
      }
    };
    socket.on('meeting:state', onState);
    return () => {
      socket.off('meeting:state', onState);
    };
  }, [socket, user._id]);

  const handleLeave = () => {
    api.post(`/meetings/${meeting._id}/leave`).catch(() => {});
    onLeave();
  };

  const toggleWhiteboard = (next: boolean) => {
    setWhiteboardOpen(next);
    socket.emit('meeting:state', {
      meetingId: meeting._id,
      type: 'whiteboard',
      value: next,
    });
  };

  // ─── WAITING ROOM ──────────────────────────────────────
  if (joinState === 'pending') {
    return (
      <WaitingRoom
        meeting={meeting}
        onLeave={handleLeave}
        onAdmitted={() => setAdmitRetry((n) => n + 1)}
      />
    );
  }

  if (joinState === 'loading') {
    return (
      <div className="meeting-livekit">
        <div className="meeting-loading">
          <div className="spinner" />
          <div>Connecting to the meeting…</div>
        </div>
      </div>
    );
  }

  if (joinState === 'error' || !media?.token || !media?.url) {
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

  // ─── ADMITTED — full meeting room ──────────────────────
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

          {/* Self-view PiP — visible while your camera is on, even during screen share */}
          <SelfView />

          <MeetingRoomExtras
            meeting={meeting}
            whiteboardOpen={whiteboardOpen}
            setWhiteboardOpen={toggleWhiteboard}
          />

          {/* Host/teacher/admin always sees the waiting room panel */}
          {isHost && <HostApprovalPanel meetingId={meeting._id} />}
        </LiveKitRoom>
      </div>

      {/* Whiteboard panel — opens for EVERY participant when toggled */}
      {whiteboardOpen && (
        <aside className="panel">
          <div className="panel-header">
            <h2 style={{ margin: 0 }}>Collaborative whiteboard</h2>
            <button
              className="btn"
              style={{ padding: '6px 10px' }}
              onClick={() => toggleWhiteboard(false)}
            >
              <X size={14} />
            </button>
          </div>
          <WhiteboardPanel
            meetingId={meeting._id}
            socket={socket}
            board={board}
            setBoard={setBoard}
            canClear={isHost}
          />
          <p className="muted" style={{ marginTop: 12 }}>
            {isHost
              ? 'As the host, you can clear the board for everyone.'
              : 'Changes are synced in real time.'}
          </p>
        </aside>
      )}
    </div>
  );
}

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
      <div className="meeting-info-pill">
        <b>{meeting.title}</b>
        <span style={{ color: '#aaa' }}> · {meeting.code}</span>
      </div>

      <div
        className={`meeting-status-pill ${
          connectionState === ConnectionState.Connected ? 'ok' : 'warn'
        }`}
      >
        {connectionState}
      </div>

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