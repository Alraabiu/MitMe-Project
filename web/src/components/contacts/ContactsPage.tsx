import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../types';

export function ContactsPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const search = async () => {
    if (q.trim().length < 2) {
      setError('Type at least 2 characters to search.');
      setRows([]);
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const r = await api.get<{ users: User[] }>(
        `/users?q=${encodeURIComponent(q.trim())}`
      );
      setRows(r.data.users);
      if (!r.data.users.length) setError('No users found.');
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addContact = async (u: User) => {
    try {
      await api.post('/contacts/requests', { userId: u._id });
      setMessage(`Contact request sent to ${u.displayName}.`);
      setError('');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Could not send request.';
      setError(msg);
      setMessage('');
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="Find people by name or username"
          />
          <button className="btn primary" onClick={search} disabled={loading}>
            <Search size={17} />
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {error && (
          <div className="error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ marginTop: 12, color: '#21a66a', fontSize: 13 }}>
            {message}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Results</h2>
          {rows.map((u) => (
            <div className="row" key={u._id}>
              <div>
                <b>{u.displayName}</b>
                <div className="muted">
                  @{u.username} · {u.presence || 'offline'}
                </div>
              </div>
              <button className="btn" onClick={() => addContact(u)}>
                Add contact
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}