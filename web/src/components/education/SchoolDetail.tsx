import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Users,
  UserPlus,
  Check,
  X as XIcon,
  Hash,
  School as SchoolIcon,
  ChevronRight,
  UserCheck,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import {
  getSchool,
  listSchoolRequests,
  approveSchoolRequest,
  rejectSchoolRequest,
  createStudent,
} from '../../services/schools';
import { CreateClassInSchoolForm } from './CreateClassInSchoolForm';
import type {
  Meeting,
  School,
  ClassItem,
  SchoolJoinRequest,
  User,
} from '../../types';

interface Props {
  schoolId: string;
  user: User;
  onBack: () => void;
  onOpenMeeting?: (m: Meeting | null) => void;
  onOpenClass?: (classId: string) => void;
}

type View = { kind: 'detail' } | { kind: 'create-class' };

export function SchoolDetail({
  schoolId,
  onBack,
  onOpenClass,
}: Props) {
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [requests, setRequests] = useState<SchoolJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>({ kind: 'detail' });

  // Add Student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newClassId, setNewClassId] = useState<string | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [addStudentSuccess, setAddStudentSuccess] = useState<string | null>(
    null
  );

  /* ─── Load ────────────────────────────────────────── */

  const load = useCallback(async () => {
    try {
      const [detail, reqs] = await Promise.all([
        getSchool(schoolId),
        listSchoolRequests(schoolId).catch(() => []),
      ]);
      setSchool(detail.school);
      setClasses(detail.classes);
      setRequests(reqs);
    } catch {
      setSchool(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  /* ─── Approve / Reject ────────────────────────────── */

  const handleApprove = async (req: SchoolJoinRequest) => {
    try {
      setBusy(true);
      await approveSchoolRequest(schoolId, req.classId, req.requestId);
      setRequests((prev) => prev.filter((r) => r.requestId !== req.requestId));
      const detail = await getSchool(schoolId);
      setClasses(detail.classes);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (req: SchoolJoinRequest) => {
    if (
      !confirm(
        `Reject ${req.user.displayName}'s request to join ${req.className}?`
      )
    ) {
      return;
    }
    try {
      setBusy(true);
      await rejectSchoolRequest(schoolId, req.classId, req.requestId);
      setRequests((prev) => prev.filter((r) => r.requestId !== req.requestId));
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  /* ─── Add Student ─────────────────────────────────── */

  const openAddStudent = () => {
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewClassId(null);
    setAddStudentError(null);
    setAddStudentSuccess(null);
    setShowAddStudent(true);
  };

  const closeAddStudent = () => {
    if (addingStudent) return;
    setShowAddStudent(false);
  };

  const submitAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddStudentError('Student name is required.');
      return;
    }
    if (newPassword.length < 8) {
      setAddStudentError('Password must be at least 8 characters.');
      return;
    }
    setAddStudentError(null);
    setAddingStudent(true);
    try {
      const res = await createStudent(schoolId, {
        displayName: newName.trim(),
        username: newUsername.trim() || undefined,
        password: newPassword,
        classId: newClassId || undefined,
      });
      setAddStudentSuccess(
        res?.message || `Student "${newName}" created successfully.`
      );
      const detail = await getSchool(schoolId);
      setClasses(detail.classes);
      // Auto-close after 1.5s
      setTimeout(() => setShowAddStudent(false), 1500);
    } catch (err: any) {
      setAddStudentError(
        err?.response?.data?.message || 'Unable to create student.'
      );
    } finally {
      setAddingStudent(false);
    }
  };

  /* ─── Loading / Not Found ─────────────────────────── */

  if (loading) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: 'var(--muted, #8a8296)',
        }}
      >
        Loading school…
      </div>
    );
  }

  if (!school) {
    return (
      <div style={{ padding: 24 }}>
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 0,
            color: '#a78bfa',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div style={{ color: 'var(--muted, #8a8296)' }}>School not found.</div>
      </div>
    );
  }

  /* ─── Create class view ───────────────────────────── */

  if (view.kind === 'create-class') {
    return (
      <CreateClassInSchoolForm
        schoolId={schoolId}
        onCancel={() => setView({ kind: 'detail' })}
        onCreated={() => {
          setView({ kind: 'detail' });
          load();
        }}
      />
    );
  }

  /* ─── Detail view ─────────────────────────────────── */

  const owner = typeof school.owner === 'object' ? school.owner : null;
  const coverColor = school.coverColor || '#6d42d8';

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 0,
            color: '#a78bfa',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: '1px solid var(--border, #2a2538)',
            color: 'var(--ink, #f5f3ff)',
            padding: '6px 12px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: refreshing ? 'default' : 'pointer',
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* School hero */}
      <div
        style={{
          padding: 20,
          borderRadius: 16,
          background: coverColor,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.20)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <SchoolIcon size={26} color="#fff" />
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -0.4,
          }}
        >
          {school.name}
        </div>
        {school.description && (
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            {school.description}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255,255,255,0.20)',
              padding: '5px 10px',
              borderRadius: 12,
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            <Hash size={12} />
            {school.code}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Owner: {owner?.displayName || owner?.username || 'You'}
          </div>
        </div>
      </div>

      {/* Pending requests */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: 'rgba(109, 66, 216, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={16} color="#a78bfa" />
            </div>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>
              Pending requests
            </div>
            <div
              style={{
                background: 'rgba(109, 66, 216, 0.15)',
                color: '#a78bfa',
                padding: '3px 8px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 900,
              }}
            >
              {requests.length}
            </div>
          </div>

          {requests.map((req) => (
            <div
              key={req.requestId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--surface, #1a1526)',
                border: '1px solid var(--border, #2a2538)',
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  background: 'rgba(109, 66, 216, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a78bfa',
                  fontWeight: 900,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {String(req.user?.displayName || '?')
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {req.user?.displayName || 'Unknown'}
                </div>
                <div
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: 'var(--muted, #8a8296)',
                  }}
                >
                  wants to join{' '}
                  <strong style={{ color: '#a78bfa' }}>{req.className}</strong>
                </div>
                {req.message && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--muted, #8a8296)',
                      fontStyle: 'italic',
                    }}
                  >
                    "{req.message}"
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={busy}
                  title="Approve"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: '#6d42d8',
                    border: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: busy ? 'default' : 'pointer',
                    color: '#fff',
                  }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={busy}
                  title="Reject"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    background: 'rgba(221, 51, 51, 0.15)',
                    border: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: busy ? 'default' : 'pointer',
                    color: '#ff8a8a',
                  }}
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setView({ kind: 'create-class' })}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 12,
            border: 0,
            background: 'linear-gradient(135deg, #6d42d8, #4f7cf6)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Create Class
        </button>

        <button
          onClick={openAddStudent}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1.5px solid #6d42d8',
            background: 'var(--surface, #1a1526)',
            color: '#a78bfa',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <UserPlus size={16} />
          Add Student
        </button>
      </div>

      {/* Classes list */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: 'rgba(109, 66, 216, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={16} color="#a78bfa" />
          </div>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 900 }}>
            Classes
          </div>
          <div
            style={{
              background: 'rgba(109, 66, 216, 0.15)',
              color: '#a78bfa',
              padding: '3px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 900,
            }}
          >
            {classes.length}
          </div>
        </div>

        {classes.length === 0 ? (
          <div
            style={{
              background: 'var(--surface, #1a1526)',
              border: '1px solid var(--border, #2a2538)',
              borderRadius: 12,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 4 }}>
              No classes yet
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted, #8a8296)',
              }}
            >
              Create your first class inside {school.name}.
            </div>
          </div>
        ) : (
          classes.map((cls) => {
            const msgCount = (cls as any).messageCount ?? 0;
            const pendingCount = cls.pendingCount ?? 0;
            const memberCount = cls.memberCount ?? 0;
            const joinCode = cls.joinCode || cls.code;
            const accent = cls.coverColor || '#6d42d8';

            return (
              <div
                key={cls._id}
                onClick={() => onOpenClass?.(cls._id)}
                style={{
                  display: 'flex',
                  background: 'var(--surface, #1a1526)',
                  border: '1px solid var(--border, #2a2538)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 10,
                  cursor: onOpenClass ? 'pointer' : 'default',
                }}
              >
                <div style={{ width: 5, background: accent, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: 800,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cls.name}
                    </div>
                    {pendingCount > 0 && (
                      <div
                        style={{
                          background: 'rgba(255, 180, 60, 0.15)',
                          color: '#ffb43c',
                          padding: '3px 8px',
                          borderRadius: 10,
                          fontSize: 10,
                          fontWeight: 900,
                        }}
                      >
                        {pendingCount} pending
                      </div>
                    )}
                  </div>

                  {cls.subject && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted, #8a8296)',
                        marginTop: 3,
                      }}
                    >
                      {cls.subject}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 10,
                      fontSize: 11,
                      color: 'var(--muted, #8a8296)',
                    }}
                  >
                    <span>
                      Code:{' '}
                      <strong style={{ color: '#a78bfa', fontWeight: 800 }}>
                        {joinCode}
                      </strong>
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Users size={11} />
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 10,
                      fontSize: 11,
                      color: 'var(--muted, #8a8296)',
                      fontStyle: 'italic',
                    }}
                  >
                    <span>{msgCount} messages</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Student modal */}
      {showAddStudent && (
        <div
          onClick={closeAddStudent}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface, #1a1526)',
              border: '1px solid var(--border, #2a2538)',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>
              Add Student
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--muted, #8a8296)',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Create a login for a new student. They can sign in with the
              username and password you set.
            </div>

            {addStudentSuccess ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'rgba(60, 200, 120, 0.1)',
                  borderLeft: '3px solid #3cc878',
                  color: '#7ed9a1',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ✓ {addStudentSuccess}
              </div>
            ) : (
              <form onSubmit={submitAddStudent}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  Full name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rabiu Musa"
                  disabled={addingStudent}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border, #2a2538)',
                    background: 'var(--bg, #0f0a18)',
                    color: 'var(--ink, #f5f3ff)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    marginBottom: 14,
                    outline: 'none',
                  }}
                />

                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  Username (optional)
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="auto-generated if empty"
                  disabled={addingStudent}
                  autoCapitalize="none"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border, #2a2538)',
                    background: 'var(--bg, #0f0a18)',
                    color: 'var(--ink, #f5f3ff)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    marginBottom: 14,
                    outline: 'none',
                  }}
                />

                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  disabled={addingStudent}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border, #2a2538)',
                    background: 'var(--bg, #0f0a18)',
                    color: 'var(--ink, #f5f3ff)',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    marginBottom: 14,
                    outline: 'none',
                  }}
                />

                {classes.length > 0 && (
                  <>
                    <label
                      style={{
                        display: 'block',
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 6,
                      }}
                    >
                      Enroll in class (optional)
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >
                      {classes.map((c) => {
                        const selected = newClassId === c._id;
                        return (
                          <button
                            key={c._id}
                            type="button"
                            onClick={() =>
                              setNewClassId(selected ? null : c._id)
                            }
                            disabled={addingStudent}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 10,
                              border: selected
                                ? '1.5px solid #6d42d8'
                                : '1.5px solid var(--border, #2a2538)',
                              background: selected
                                ? 'rgba(109, 66, 216, 0.15)'
                                : 'var(--bg, #0f0a18)',
                              color: selected ? '#a78bfa' : 'var(--muted, #8a8296)',
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {addStudentError && (
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
                    {addStudentError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={addingStudent}
                    style={{
                      flex: 1,
                      padding: '12px 20px',
                      borderRadius: 10,
                      border: 0,
                      background: 'linear-gradient(135deg, #6d42d8, #4f7cf6)',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: addingStudent ? 'default' : 'pointer',
                      opacity: addingStudent ? 0.6 : 1,
                    }}
                  >
                    {addingStudent ? 'Creating…' : 'Create Student'}
                  </button>
                  <button
                    type="button"
                    onClick={closeAddStudent}
                    disabled={addingStudent}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 10,
                      border: '1px solid var(--border, #2a2538)',
                      background: 'transparent',
                      color: 'var(--muted, #8a8296)',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: addingStudent ? 'default' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}