import { useState } from 'react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import { createClassInSchool } from '../../services/schools';
import type { ClassItem } from '../../types';

interface Props {
  schoolId: string;
  onCancel: () => void;
  onCreated: (cls: ClassItem) => void;
}

export function CreateClassInSchoolForm({
  schoolId,
  onCancel,
  onCreated,
}: Props) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Class name must be at least 2 characters.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const cls = await createClassInSchool(schoolId, {
        name: trimmedName,
        subject: subject.trim() || undefined,
      });
      onCreated(cls);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || 'Unable to create class.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'transparent',
          border: 0,
          color: '#a78bfa',
          fontWeight: 800,
          fontSize: 13,
          cursor: busy ? 'default' : 'pointer',
          padding: 0,
          marginBottom: 16,
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: 'rgba(109, 66, 216, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GraduationCap size={22} color="#a78bfa" />
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: -0.5,
          }}
        >
          Create Class
        </h1>
      </div>

      <p
        style={{
          margin: '0 0 24px',
          color: 'var(--muted, #8a8296)',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        A unique join code will be generated. Share it with anyone you want to
        invite — they'll request to join and you approve.
      </p>

      <form onSubmit={submit}>
        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 6,
            color: 'var(--ink, #f5f3ff)',
          }}
        >
          Class name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Class 1"
          maxLength={120}
          disabled={busy}
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border, #2a2538)',
            background: 'var(--surface, #1a1526)',
            color: 'var(--ink, #f5f3ff)',
            fontSize: 14,
            boxSizing: 'border-box',
            marginBottom: 16,
            outline: 'none',
          }}
        />

        <label
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 6,
            color: 'var(--ink, #f5f3ff)',
          }}
        >
          Subject (optional)
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Mathematics"
          maxLength={60}
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 10,
            border: '1px solid var(--border, #2a2538)',
            background: 'var(--surface, #1a1526)',
            color: 'var(--ink, #f5f3ff)',
            fontSize: 14,
            boxSizing: 'border-box',
            marginBottom: 16,
            outline: 'none',
          }}
        />

        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              borderLeft: '3px solid #d33',
              background: 'rgba(221, 51, 51, 0.08)',
              color: '#ff8a8a',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              border: 0,
              background: 'linear-gradient(135deg, #6d42d8, #4f7cf6)',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Creating…' : 'Create Class'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '12px 20px',
              borderRadius: 10,
              border: '1px solid var(--border, #2a2538)',
              background: 'transparent',
              color: 'var(--muted, #8a8296)',
              fontWeight: 700,
              fontSize: 14,
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}