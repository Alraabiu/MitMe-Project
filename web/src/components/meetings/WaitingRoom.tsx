import { useEffect, useState } from 'react';
import { Clock, XCircle } from 'lucide-react';
import { getSocket } from '../../services/socket';
import type { Meeting } from '../../types';

interface WaitingRoomProps {
  meeting: Meeting;
  onLeave: () => void;
  onAdmitted: () => void;
}

export function WaitingRoom({
  meeting,
  onLeave,
  onAdmitted,
}: WaitingRoomProps) {
  const socket = getSocket();
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    const onAdmittedEvent = (payload: { meetingId: string }) => {
      if (payload.meetingId !== meeting._id) return;
      onAdmitted();
    };

    const onRejectedEvent = (payload: { meetingId: string }) => {
      if (payload.meetingId !== meeting._id) return;
      setRejected(true);
    };

    socket.on('meeting:admitted', onAdmittedEvent);
    socket.on('meeting:rejected', onRejectedEvent);

    return () => {
      socket.off('meeting:admitted', onAdmittedEvent);
      socket.off('meeting:rejected', onRejectedEvent);
    };
  }, [socket, meeting._id, onAdmitted]);

  if (rejected) {
    return (
      <div className="meeting-waiting">
        <div className="meeting-waiting-card">
          <XCircle size={48} color="#d94b65" />
          <h2>The host did not admit you</h2>
          <p className="muted">You were not allowed into this meeting.</p>
          <button className="btn primary" onClick={onLeave}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-waiting">
      <div className="meeting-waiting-card">
        <div className="meeting-waiting-spinner" />
        <h2>Waiting for the host to admit you</h2>
        <p className="muted">
          <Clock
            size={14}
            style={{ verticalAlign: 'middle', marginRight: 6 }}
          />
          {meeting.title} · {meeting.code}
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          The host has been notified. Please stay on this screen.
        </p>
        <button
          className="btn"
          onClick={onLeave}
          style={{ marginTop: 20 }}
        >
          Leave
        </button>
      </div>
    </div>
  );
}