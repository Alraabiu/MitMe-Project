import { useCallback, useEffect, useState } from 'react';
import { listClasses } from '../../services/classes';
import type { ClassItem, Meeting, User } from '../../types';
import { ClassCard } from './ClassCard';
import { CreateClassForm } from './CreateClassForm';
import { JoinClassForm } from './JoinClassForm';
import { ClassDetail } from './ClassDetail';

interface Props {
  user: User;
  onOpenMeeting: (m: Meeting) => void;
}

type View =
  | { type: 'list' }
  | { type: 'create' }
  | { type: 'join'; code?: string }
  | { type: 'detail'; classId: string };

export function ClassesPage({ user, onOpenMeeting }: Props) {
  const [view, setView] = useState<View>({ type: 'list' });
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listClasses();
      setClasses(list);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || 'Unable to load classes.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ─── Auto-handle ?join=CODE on mount ────────────── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      setView({ type: 'join', code: code.toUpperCase() });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (view.type === 'list') load();
  }, [view, load]);

  if (view.type === 'create') {
    return (
      <CreateClassForm
        onCreated={(cls) => setView({ type: 'detail', classId: cls._id })}
        onCancel={() => setView({ type: 'list' })}
      />
    );
  }

  if (view.type === 'join') {
    return (
      <JoinClassForm
        initialCode={view.code}
        onJoined={(cls) => setView({ type: 'detail', classId: cls._id })}
        onCancel={() => setView({ type: 'list' })}
      />
    );
  }

  if (view.type === 'detail') {
    return (
      <ClassDetail
        classId={view.classId}
        user={user}
        onBack={() => setView({ type: 'list' })}
        onOpenMeeting={onOpenMeeting}
      />
    );
  }

  return (
    <div className="classesPage">
      <div className="classesHeader">
        <div>
          <h1 className="classesTitle">Classes</h1>
          <p className="classesSub">
            Create your own class or join one with a code
          </p>
        </div>

        <div className="classesActions">
          <button
            className="classesBtn"
            onClick={() => setView({ type: 'create' })}
          >
            + Create Class
          </button>
          <button
            className="classesBtn classesBtnGhost"
            onClick={() => setView({ type: 'join' })}
          >
            Join with Code
          </button>
        </div>
      </div>

      {loading ? (
        <div className="classesLoading">Loading classes...</div>
      ) : error ? (
        <div className="classFormError">{error}</div>
      ) : classes.length === 0 ? (
        <div className="classesEmpty">
          <div className="classesEmptyTitle">No classes yet</div>
          <div className="classesEmptyText">
            Create a class for your group, or join one with a code.
          </div>
        </div>
      ) : (
        <div className="classesList">
          {classes.map((cls) => (
            <ClassCard
              key={cls._id}
              cls={cls}
              onClick={(id) => setView({ type: 'detail', classId: id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}