import { useCallback, useEffect, useState } from 'react';
import {
  archiveClass,
  buildClassShareLink,
  buildClassShareMessage,
  endClassMeeting,
  getActiveClassMeeting,
  getClass,
  joinMeeting as joinMeetingApi,
  leaveClass,
  removeStudent,
  startClassMeeting,
} from '../../services/classes';
import type { ClassItem, ClassStudent, Meeting, User } from '../../types';

interface Props {
  classId: string;
  user: User;
  onBack: () => void;
  onOpenMeeting: (m: Meeting) => void;
}

export function ClassDetail({ classId, user, onBack, onOpenMeeting }: Props) {
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const role = String(user?.role || 'student').toLowerCase();
  const isStudent = role === 'student';
  const isOwner =
    cls && user && String(cls.teacher?._id) === String(user._id);

  const load = useCallback(async () => {
    try {
      const [data, activeMeeting] = await Promise.all([
        getClass(classId),
        getActiveClassMeeting(classId).catch(() => null),
      ]);
      setCls(data);
      setMeeting(activeMeeting);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to load class.');
      onBack();
    } finally {
      setLoading(false);
    }
  }, [classId, onBack]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      getActiveClassMeeting(classId)
        .then(setMeeting)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [classId, load]);

  /* ─── Share handlers ─────────────────────────────── */

  const copyCode = async () => {
    if (!cls) return;
    await navigator.clipboard.writeText(cls.code);
    setCopied('code');
    setTimeout(() => setCopied(null), 1800);
  };

  const copyLink = async () => {
    if (!cls) return;
    await navigator.clipboard.writeText(buildClassShareLink(cls.code));
    setCopied('link');
    setTimeout(() => setCopied(null), 1800);
  };

  const shareClass = async () => {
    if (!cls) return;
    const text = buildClassShareMessage(cls.name, cls.code);

    if (navigator.share) {
      try {
        await navigator.share({ title: cls.name, text });
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }

    await navigator.clipboard.writeText(text);
    alert('Invite message copied to clipboard!');
  };

  /* ─── Live class ─────────────────────────────────── */

  const handleStartLive = async () => {
    try {
      setBusy(true);
      const m = await startClassMeeting(classId);
      onOpenMeeting(m);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to start session.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoinLive = async () => {
    if (!meeting) return;
    try {
      setBusy(true);
      const joined = await joinMeetingApi(meeting._id);
      onOpenMeeting(joined);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to join session.');
    } finally {
      setBusy(false);
    }
  };

  const handleEndLive = async () => {
    if (!window.confirm('End the live session? Students will be disconnected.')) return;
    try {
      await endClassMeeting(classId);
      setMeeting(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to end session.');
    }
  };

  /* ─── Membership ─────────────────────────────────── */

  const handleLeave = async () => {
    if (!window.confirm('Leave this class? You will need the code to rejoin.')) return;
    try {
      await leaveClass(classId);
      onBack();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to leave class.');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this class? Students will no longer see it.')) return;
    try {
      await archiveClass(classId);
      onBack();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to archive class.');
    }
  };

  const handleRemoveStudent = async (stu: ClassStudent | string) => {
    const sid = typeof stu === 'string' ? stu : stu._id;
    const nm =
      typeof stu === 'string' ? 'this student' : stu.displayName || stu.username;
    if (!window.confirm(`Remove ${nm} from this class?`)) return;
    try {
      await removeStudent(classId, sid);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Unable to remove student.');
    }
  };

  if (loading) return <div className="classesLoading">Loading class...</div>;
  if (!cls) return <div className="classesLoading">Class not found.</div>;

  const students: (ClassStudent | string)[] = Array.isArray(cls.students)
    ? cls.students
    : [];
  const isLive = Boolean(meeting);
  const shareLink = buildClassShareLink(cls.code);

  return (
    <div className="classDetailWrap">
      <button className="classDetailBack" onClick={onBack}>
        ← Back to classes
      </button>

      {/* Hero */}
      <div
        className="classDetailHero"
        style={{ backgroundColor: cls.coverColor || '#4B24A8' }}
      >
        {isLive && (
          <div className="classLiveBadge">
            <span className="classLiveDot" />
            LIVE NOW
          </div>
        )}
        <h1 className="classDetailHeroName">{cls.name}</h1>
        {cls.subject ? (
          <div className="classDetailHeroSubject">{cls.subject}</div>
        ) : null}

        {/* Share card */}
        <div className="classShareCard">
          <div className="classShareRow">
            <div className="classShareLabel">Code</div>
            <div className="classShareValue">{cls.code}</div>
            <button className="classShareCopy" onClick={copyCode}>
              {copied === 'code' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="classShareRow">
            <div className="classShareLabel">Link</div>
            <div className="classShareLinkText">{shareLink}</div>
            <button className="classShareCopy" onClick={copyLink}>
              {copied === 'link' ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <button className="classShareBtn" onClick={shareClass}>
            Share with class
          </button>
        </div>
      </div>

      {/* Live Teaching (teacher) */}
      {isOwner && (
        <div className="classLiveSection">
          <h3 className="classLiveSectionTitle">Live Teaching</h3>
          <div className="classLiveRow">
            {isLive ? (
              <>
                <button className="classesBtn" onClick={handleJoinLive} disabled={busy}>
                  Rejoin Live Class
                </button>
                <button
                  className="classesBtn classesBtnDanger"
                  onClick={handleEndLive}
                  disabled={busy}
                >
                  End Session
                </button>
              </>
            ) : (
              <button className="classesBtn" onClick={handleStartLive} disabled={busy}>
                {busy ? 'Starting...' : 'Start Live Class'}
              </button>
            )}
          </div>
          <div className="classLiveHint">
            Whiteboard, screen share and mic controls are inside the live session.
          </div>
        </div>
      )}

      {/* Teacher live indicator for students */}
      {isStudent && isLive && (
        <div className="classLiveSection">
          <h3 className="classLiveSectionTitle">Teacher is live now</h3>
          <button className="classesBtn" onClick={handleJoinLive} disabled={busy}>
            Join Live Class with {meeting?.host?.displayName || 'Teacher'}
          </button>
        </div>
      )}

      {/* About */}
      {cls.description ? (
        <div className="classDetailCard">
          <h3 className="classDetailCardTitle">About</h3>
          <p className="classDetailCardText">{cls.description}</p>
        </div>
      ) : null}

      <div className="classDetailCard">
        <h3 className="classDetailCardTitle">Teacher</h3>
        <p className="classDetailCardText">
          {cls.teacher?.displayName || cls.teacher?.username || 'Teacher'}
        </p>
      </div>

      {/* Students */}
      <div className="classDetailCard">
        <div className="classDetailCardHeader">
          <h3 className="classDetailCardTitle" style={{ margin: 0 }}>
            Students
          </h3>
          <span className="classDetailCount">{students.length}</span>
        </div>

        {students.length === 0 ? (
          <p className="classDetailCardText" style={{ fontStyle: 'italic' }}>
            No students have joined yet. Share the code or link above.
          </p>
        ) : (
          students.map((stu, idx) => {
            const sid = typeof stu === 'string' ? stu : stu._id;
            const name =
              typeof stu === 'string'
                ? `Student ${idx + 1}`
                : stu.displayName || stu.username;
            const email = typeof stu === 'string' ? '' : stu.email || '';

            return (
              <div key={sid} className="classStudentRow">
                <div className="classStudentAvatar">
                  {String(name).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="classStudentName">{name}</div>
                  {email ? <div className="classStudentMeta">{email}</div> : null}
                </div>
                {isOwner && (
                  <button
                    className="classStudentRemove"
                    onClick={() => handleRemoveStudent(stu)}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="classFormActions">
        {isOwner && (
          <button className="classesBtn classesBtnDanger" onClick={handleArchive}>
            Archive Class
          </button>
        )}
        {isStudent && (
          <button className="classesBtn classesBtnDanger" onClick={handleLeave}>
            Leave Class
          </button>
        )}
      </div>
    </div>
  );
}
