import { useRef, useState } from 'react';
import { Camera, User as UserIcon } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../types';

interface SettingsPageProps {
  user: User;
  setUser: (u: User) => void;
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
      // Send avatarUrl even if empty, so removal works
      if (avatar !== (user.avatarUrl || '')) {
        payload.avatarUrl = avatar; // may be '' to remove
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

  const initial = (user.displayName || '?').slice(0, 1).toUpperCase();

  return (
    <div className="page">
      <div className="card form">
        <h2>Profile</h2>

        {/* Avatar */}
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

        {/* Display name */}
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

        {/* Bio */}
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

        <button
          className="btn primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}