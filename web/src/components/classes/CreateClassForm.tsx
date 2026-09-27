import { useState } from 'react';
import { createClass } from '../../services/classes';
import type { ClassItem } from '../../types';

interface Props {
  onCreated: (cls: ClassItem) => void;
  onCancel: () => void;
}

export function CreateClassForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Class name must be at least 2 characters.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const cls = await createClass({
        name: name.trim(),
        subject: subject.trim() || undefined,
        description: description.trim() || undefined,
      });
      onCreated(cls);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to create class.'
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

      <h1 className="classFormTitle">Create Class</h1>
      <p className="classFormSub">
        Students will join using the code we generate for you.
      </p>

      <form onSubmit={submit}>
        <label className="classFormLabel">Class name *</label>
        <input
          className="classFormInput"
          placeholder="e.g. Mathematics 101"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          autoFocus
        />

        <label className="classFormLabel">Subject (optional)</label>
        <input
          className="classFormInput"
          placeholder="e.g. Math"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={busy}
        />

        <label className="classFormLabel">Description (optional)</label>
        <textarea
          className="classFormInput classFormTextarea"
          placeholder="What will students learn?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={busy}
        />

        {error && <div className="classFormError">{error}</div>}

        <div className="classFormActions">
          <button type="submit" className="classesBtn" disabled={busy}>
            {busy ? 'Creating...' : 'Create Class'}
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
