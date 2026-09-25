import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Video } from 'lucide-react';
import { api } from '../../services/api';
import type { Meeting, User } from '../../types';

interface DashboardPageProps {
  user: User;
  onOpenMeeting: (m: Meeting) => void;
}

export function DashboardPage({ user, onOpenMeeting }: DashboardPageProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('Quick team meeting');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const r = await api.get<{ meetings: Meeting[] }>('/meetings');
      setMeetings(r.data.meetings);
    } catch {
      setError('Could not load meetings.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    try {
      const { data } = await api.post<{ meeting: Meeting }>('/meetings', {
        title: title.trim() || 'Untitled meeting',
      });
      setShowCreate(false);
      onOpenMeeting(data.meeting);
      load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Unable to create meeting';
      alert(msg);
    }
  };

  const join = async () => {
    const code = prompt('Enter Meeting ID');
    if (!code) return;
    try {
      const { data } = await api.post<{ meeting: Meeting }>(
        `/meetings/${code}/join`
      );
      onOpenMeeting(data.meeting);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Unable to join meeting';
      alert(msg);
    }
  };

  const open = async (m: Meeting) => {
    try {
      const r = await api.post<{ meeting: Meeting }>(`/meetings/${m._id}/join`);
      onOpenMeeting(r.data.meeting);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Unable to open meeting';
      alert(msg);
    }
  };

  return (
    <div className="page">
      <div className="cards">
        <button className="action" onClick={() => setShowCreate(true)}>
          <Plus size={24} />
          <strong>New meeting</strong>
          <span>Start an instant collaboration room.</span>
        </button>

        <button className="action" onClick={join}>
          <Video size={24} />
          <strong>Join meeting</strong>
          <span>Use a MitMe meeting ID.</span>
        </button>

        <button className="action" onClick={() => setShowCreate(true)}>
          <CalendarDays size={24} />
          <strong>Schedule</strong>
          <span>Plan your next meeting.</span>
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Create meeting</h2>
          <div className="toolbar">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
            />
            <button className="btn primary" onClick={create}>
              Create & join
            </button>
            <button className="btn" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="error">{error}</div>
        </div>
      )}

      <div className="grid">
        <section className="card">
          <h2>Upcoming & recent meetings</h2>
          {meetings.length ? (
            meetings.slice(0, 6).map((m) => (
              <div className="row" key={m._id}>
                <div>
                  <b>{m.title}</b>
                  <div className="muted">
                    ID {m.code} · {m.status}
                  </div>
                </div>
                <button className="btn" onClick={() => open(m)}>
                  Open
                </button>
              </div>
            ))
          ) : (
            <div className="empty">
              No meetings yet. Start your first MitMe room.
            </div>
          )}
        </section>

        <section className="card">
          <h2>MitMe workspace</h2>
          <div className="row">
            <span>Profile</span>
            <span className="pill">{user.username}</span>
          </div>
          <div className="row">
            <span>Presence</span>
            <span className="pill">{user.presence || 'online'}</span>
          </div>
          <div className="row">
            <span>Core tools</span>
            <span className="muted">Meet · Chat · Whiteboard</span>
          </div>
        </section>
      </div>
    </div>
  );
}