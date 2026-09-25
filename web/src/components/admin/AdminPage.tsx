import { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface Stats {
  users?: number;
  activeUsers?: number;
  meetings?: number;
  liveMeetings?: number;
  auditLogs?: number;
}

export function AdminPage() {
  const [data, setData] = useState<Stats>();
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Stats>('/admin/stats')
      .then((r) => setData(r.data))
      .catch(() => setError('Could not load admin stats.'));
  }, []);

  const cards: [string, number | undefined][] = [
    ['Users', data?.users],
    ['Active users', data?.activeUsers],
    ['Meetings', data?.meetings],
    ['Live meetings', data?.liveMeetings],
    ['Audit logs', data?.auditLogs],
  ];

  return (
    <div className="page">
      {error && (
        <div className="card">
          <div className="error">{error}</div>
        </div>
      )}

      <div className="cards">
        {cards.map(([label, value]) => (
          <div className="card" key={label}>
            <div className="muted">{label}</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>
              {value ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}