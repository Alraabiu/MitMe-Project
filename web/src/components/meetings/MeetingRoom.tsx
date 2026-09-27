import { useEffect, useState } from 'react';
import { MonitorUp } from 'lucide-react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useMeetingMedia } from '../../hooks/useMeetingMedia';
import { useMeetingParticipants } from '../../hooks/useMeetingParticipants';
import { useWebRTC } from '../../hooks/useWebRTC';
import { ParticipantTile } from './ParticipantTile';
import { MeetingControls } from './MeetingControls';
import { WhiteboardPanel } from '../whiteboard/WhiteboardPanel';
import type { Meeting, User, Whiteboard } from '../../types';

interface MeetingRoomProps {
  meeting: Meeting;
  user: User;
  onLeave: () => void;
}

export function MeetingRoom({ meeting, user, onLeave }: MeetingRoomProps) {
  const socket = getSocket();
  const [hand, setHand] = useState(false);
  const [share, setShare] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [board, setBoard] = useState<Whiteboard | null>(null);

  const { stream, muted, camera, toggleMic, toggleCamera, stopAll } =
    useMeetingMedia(meeting._id, socket);

  const participants = useMeetingParticipants(socket, meeting._id, user);
  const remoteStreams = useWebRTC(socket, meeting._id, user, stream);

  // Join room on socket
  useEffect(() => {
    socket.emit('meeting:join', meeting._id);
    return () => {
      socket.emit('meeting:leave', meeting._id);
    };
  }, [socket, meeting._id]);

  const handleShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return alert('Screen sharing is not available in this browser.');
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setShare(true);
      socket.emit('meeting:state', {
        meetingId: meeting._id,
        type: 'share',
        value: true,
      });
      s.getVideoTracks()[0].onended = () => {
        setShare(false);
        socket.emit('meeting:state', {
          meetingId: meeting._id,
          type: 'share',
          value: false,
        });
      };
    } catch {
      /* cancelled */
    }
  };

  const toggleHand = () => {
    const next = !hand;
    setHand(next);
    socket.emit('meeting:state', {
      meetingId: meeting._id,
      type: 'hand',
      value: next,
    });
  };

  const handleLeave = () => {
    stopAll();
    api.post(`/meetings/${meeting._id}/leave`).catch(() => {});
    onLeave();
  };

  return (
    <div className="meeting">
      <div className="stage">
        <div className="meetingbar">
          <div>
            <b>{meeting.title}</b>
            <div className="muted" style={{ color: '#aaa' }}>
              {meeting.code} ? {meeting.status} ? {participants.length}{' '}
              {participants.length === 1 ? 'person' : 'people'}
            </div>
          </div>
          <span className="pill">{user.displayName}</span>
        </div>

        <div className="tiles">
          {participants.map((p) => {
            const streamForThis = p.isSelf
              ? stream
              : remoteStreams.get(p.user._id) ?? null;

            return (
              <ParticipantTile
                key={p.user._id}
                user={p.user}
                stream={streamForThis}
                muted={p.isSelf ? muted : p.muted}
                camera={p.isSelf ? camera : p.camera}
                hand={p.isSelf ? hand : p.hand}
                share={p.isSelf ? share : p.share}
                isSelf={p.isSelf}
              />
            );
          })}

          {share && (
            <div className="tile">
              <MonitorUp size={42} />
              <div>You are sharing your screen</div>
              <span className="label">Screen share</span>
            </div>
          )}
        </div>

        <MeetingControls
          muted={muted}
          camera={camera}
          share={share}
          hand={hand}
          whiteboardOpen={whiteboardOpen}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleShare={handleShare}
          onToggleHand={toggleHand}
          onToggleWhiteboard={() => setWhiteboardOpen((v) => !v)}
          onLeave={handleLeave}
        />
      </div>

      {whiteboardOpen && (
        <aside className="panel">
          <h2>Collaborative whiteboard</h2>
          <WhiteboardPanel
            meetingId={meeting._id}
            socket={socket}
            board={board}
            setBoard={setBoard}
          />
          <p className="muted">
            Changes are sent through Socket.IO and persisted in MongoDB.
          </p>
        </aside>
      )}
    </div>
  );
}
