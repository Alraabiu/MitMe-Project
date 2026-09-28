import { useEffect, useState } from 'react';
import { Check, UserCheck, X } from 'lucide-react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Avatar } from '../common/Avatar';

interface WaitingParticipant {
  _id: string;
  user: {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  requestedAt?: string;
}

interface HostApprovalPanelProps {
  meetingId: string;
}

export function HostApprovalPanel({ meetingId }: HostApprovalPanelProps) {
  const socket = getSocket();
  const [requests, setRequests] = useState<WaitingParticipant[]>([]);

  // Subscribe to the requests room + load initial list
  useEffect(() => {
    // Initial load via HTTP (works even if host just opened the page)
    api
      .get<{ waiting: WaitingParticipant[] }>(`/meetings/${meetingId}/waiting`)
      .then((r) => setRequests(r.data.waiting))
      .catch(() => {});

    // Subscribe over socket for real-time updates
    socket.emit('meeting:watch-requests', meetingId);

    const onList = (payload: {
      meetingId: string;
      pending: WaitingParticipant[];
    }) => {
      if (payload.meetingId !== meetingId) return;
      setRequests(payload.pending);
    };

    const onRequest = (payload: {
      meetingId: string;
      participant: {
        _id: string;
        displayName: string;
        username: string;
        avatarUrl?: string;
      };
    }) => {
      if (payload.meetingId !== meetingId) return;
      setRequests((prev) => {
        if (prev.some((p) => p.user._id === payload.participant._id)) {
          return prev;
        }
        return [
          ...prev,
          {
            _id: payload.participant._id,
            user: payload.participant,
            requestedAt: new Date().toISOString(),
          },
        ];
      });
    };

    socket.on('meeting:pending-list', onList);
    socket.on('meeting:join-request', onRequest);

    return () => {
      socket.emit('meeting:unwatch-requests', meetingId);
      socket.off('meeting:pending-list', onList);
      socket.off('meeting:join-request', onRequest);
    };
  }, [socket, meetingId]);

  const admit = async (userId: string) => {
    try {
      await api.post(`/meetings/${meetingId}/admit/${userId}`);
      setRequests((prev) => prev.filter((r) => r.user._id !== userId));
    } catch {
      alert('Could not admit this participant.');
    }
  };

  const reject = async (userId: string) => {
    try {
      await api.post(`/meetings/${meetingId}/reject/${userId}`);
      setRequests((prev) => prev.filter((r) => r.user._id !== userId));
    } catch {
      alert('Could not reject this participant.');
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="host-approval-panel">
      <div className="host-approval-header">
        <UserCheck size={16} />
        <span>
          Waiting room · {requests.length}{' '}
          {requests.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className="host-approval-list">
        {requests.map((r) => (
          <div key={r.user._id} className="host-approval-item">
            <Avatar
              name={r.user.displayName}
              src={r.user.avatarUrl}
              size={36}
            />
            <div className="host-approval-info">
              <div className="host-approval-name">{r.user.displayName}</div>
              <div className="host-approval-sub">@{r.user.username}</div>
            </div>
            <button
              className="host-approval-btn admit"
              onClick={() => admit(r.user._id)}
              title="Admit"
            >
              <Check size={16} />
            </button>
            <button
              className="host-approval-btn reject"
              onClick={() => reject(r.user._id)}
              title="Reject"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}