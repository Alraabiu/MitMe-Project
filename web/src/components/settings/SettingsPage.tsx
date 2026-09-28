import { useRef, useState } from 'react';
import { Camera, LogOut, User as UserIcon } from 'lucide-react';
import { api, setToken } from '../../services/api';
import { disconnectSocket } from '../../services/socket';
import type { User } from '../../types';

interface SettingsPageProps {
  user: User;
  setUser: (u: User | null) => void;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function SettingsPage({ user, setUser }: SettingsPageProps) {
  const [name, setName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState(user.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const pickAvatar = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      setError('Use a JPG, PNG, WebP or GIF image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 2 MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatar('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload: Record<string, unknown> = {};
      if (name.trim() && name.trim() !== user.displayName) {
        payload.displayName = name.trim();
      }
      if (bio.trim() !== (user.bio || '')) {
        payload.bio = bio.trim();
      }
      if (avatar !== (user.avatarUrl || '')) {
        payload.avatarUrl = avatar;
      }

      if (Object.keys(payload).length === 0) {
        setMessage('Nothing to update.');
        return;
      }

      const r = await api.patch<{ user: User }>('/users/me', payload);
      setUser(r.data.user);
      setMessage('Profile saved.');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Could not save profile.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Sign out of MitMe?')) return;
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setToken(null, null);
    disconnectSocket();
    setUser(null);
  };

  const initial = (user.displayName || '?').slice(0, 1).toUpperCase();

  return (
    <div className="page">
      {/* ─── Profile Card ─────────────────────────────── */}
      <div className="card form">
        <h2>Profile</h2>

        <div className="avatar-uploader">
          <div className="avatar-preview">
            {avatar ? (
              <img src={avatar} alt="Avatar preview" />
            ) : (
              <span className="avatar-initial">{initial}</span>
            )}
          </div>

          <div className="avatar-actions">
            <button
              type="button"
              className="btn"
              onClick={pickAvatar}
              disabled={saving}
            >
              <Camera size={16} />
              {avatar ? 'Change photo' : 'Upload photo'}
            </button>

            {avatar && (
              <button
                type="button"
                className="btn danger"
                onClick={removeAvatar}
                disabled={saving}
              >
                Remove
              </button>
            )}

            <div className="muted" style={{ marginTop: 6 }}>
              JPG, PNG, WebP or GIF · max 2 MB
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED.join(',')}
            onChange={onFile}
            hidden
          />
        </div>

        <label className="field">
          <span className="field-label">
            <UserIcon size={14} /> Display name
          </span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
            maxLength={80}
          />
        </label>

        <label className="field">
          <span className="field-label">Bio</span>
          <textarea
            className="input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself"
            maxLength={240}
            rows={3}
          />
        </label>

        {error && <div className="error">{error}</div>}
        {message && (
          <div style={{ color: '#21a66a', fontSize: 13 }}>{message}</div>
        )}

        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* ─── Account Info ─────────────────────────────── */}
      <div className="card form" style={{ marginTop: 18 }}>
        <h2>Account</h2>

        <div className="row">
          <span className="muted">Username</span>
          <span className="pill">@{user.username}</span>
        </div>

        {user.email && (
          <div className="row">
            <span className="muted">Email</span>
            <span>{user.email}</span>
          </div>
        )}

        {user.phone && (
          <div className="row">
            <span className="muted">Phone</span>
            <span>{user.phone}</span>
          </div>
        )}

        <div className="row">
          <span className="muted">Role</span>
          <span className="pill">{user.role || 'student'}</span>
        </div>
      </div>

      {/* ─── Sign Out Card ───────────────────────────── */}
      <div className="card form" style={{ marginTop: 18 }}>
        <h2>Sign out</h2>
        <p className="muted" style={{ marginBottom: 16 }}>
          You can sign back in anytime.
        </p>

        <button
          className="btn"
          onClick={handleLogout}
          style={{
            color: '#d94b65',
            borderColor: '#d94b65',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '14px',
            fontSize: 15,
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );
}