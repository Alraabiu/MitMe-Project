import { useState } from 'react';
import { joinClass } from '../../services/classes';
import type { ClassItem } from '../../types';

interface Props {
  onJoined: (cls: ClassItem) => void;
  onCancel: () => void;
}

export function JoinClassForm({ onJoined, onCancel }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 6) {
      setError('Enter a valid class code.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const cls = await joinClass(trimmed);
      onJoined(cls);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to join class.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="classFormWrap">
      <button className="classDetailBack" onClick={onCancel}>
        ← Back to classes
      </button>

      <h1 className="classFormTitle">Join a Class</h1>
      <p className="classFormSub">
        Ask your teacher for the class code and enter it below.
      </p>

      <form onSubmit={submit}>
        <div className="classJoinBig">
          <input
            className="classJoinInput"
            placeholder="ABC-DEF"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={busy}
            maxLength={10}
            autoFocus
          />
        </div>

        {error && <div className="classFormError">{error}</div>}

        <div className="classFormActions">
          <button type="submit" className="classesBtn" disabled={busy}>
            {busy ? 'Joining...' : 'Join Class'}
          </button>
          <button
            type="button"
            className="classesBtn classesBtnGhost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
