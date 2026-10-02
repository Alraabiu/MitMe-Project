import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  GraduationCap,
  School as SchoolIcon,
  Users,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { listSchools } from '../../services/schools';
import type { Meeting, School, User } from '../../types';
import { CreateSchoolForm } from './CreateSchoolForm';
import { SchoolDetail } from './SchoolDetail';

interface EducationPageProps {
  user: User;
  onOpenMeeting?: (m: Meeting | null) => void;
}

type View =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; schoolId: string };

export function EducationPage({ user, onOpenMeeting }: EducationPageProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'list' });

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listSchools();
      setSchools(list);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || 'Unable to load schools.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- ROUTING ---------- */

  if (view.kind === 'create') {
    return (
      <CreateSchoolForm
        onCancel={() => setView({ kind: 'list' })}
        onCreated={(school) => {
          setSchools((prev) => [school, ...prev]);
          setView({ kind: 'detail', schoolId: school._id });
        }}
      />
    );
  }

  if (view.kind === 'detail') {
    return (
      <SchoolDetail
        schoolId={view.schoolId}
        user={user}
        onBack={() => {
          setView({ kind: 'list' });
          load();
        }}
        onOpenMeeting={onOpenMeeting}
      />
    );
  }

  /* ---------- LIST VIEW ---------- */

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: -0.6,
            }}
          >
            Education
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              color: 'var(--muted, #8a8296)',
              fontSize: 13,
            }}
          >
            Create and manage your schools
          </p>
        </div>

        <button
          type="button"
          onClick={() => setView({ kind: 'create' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #6d42d8, #4f7cf6)',
            color: '#fff',
            border: 0,
            padding: '10px 16px',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Create School
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--muted, #8a8296)',
          }}
        >
          Loading your schools…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div
          style={{
            padding: 20,
            borderLeft: '4px solid #d33',
            borderRadius: 8,
            background: 'rgba(221, 51, 51, 0.08)',
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            Couldn't load schools
          </div>
          <div style={{ color: 'var(--muted, #8a8296)', fontSize: 13 }}>
            {error}
          </div>
          <button
            type="button"
            onClick={load}
            style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: '1px solid var(--border, #ddd)',
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && schools.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            borderRadius: 16,
            border: '1px solid var(--border, #2a2538)',
            background: 'var(--surface, #1a1526)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              background: 'rgba(109, 66, 216, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={32} color="#a78bfa" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>
            Start your school
          </div>
          <div
            style={{
              color: 'var(--muted, #8a8296)',
              maxWidth: 420,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Create a school for your students. Add classes, invite learners,
            and approve who joins.
          </div>
        </div>
      )}

      {/* School list */}
      {!loading && !error && schools.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--muted, #8a8296)',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {schools.length} {schools.length === 1 ? 'school' : 'schools'}
          </div>

          {schools.map((sc) => {
            const owner = typeof sc.owner === 'object' ? sc.owner : null;
            const classCount = sc.classCount ?? 0;

            const openDetail = () =>
              setView({ kind: 'detail', schoolId: sc._id });

            return (
              <div
                key={sc._id}
                role="button"
                tabIndex={0}
                aria-label={`Open ${sc.name}`}
                onClick={openDetail}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail();
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  width: '100%',
                  textAlign: 'left',
                  padding: 0,
                  border: '1px solid var(--border, #2a2538)',
                  borderRadius: 12,
                  background: 'var(--surface, #1a1526)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'border-color 120ms ease, transform 120ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#6d42d8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor =
                    'var(--border, #2a2538)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Accent strip */}
                <div
                  style={{
                    width: 6,
                    background: sc.coverColor || '#6d42d8',
                    flexShrink: 0,
                  }}
                />

                {/* Card body — pointer-events: none so clicks reach the parent */}
                <div
                  style={{
                    flex: 1,
                    padding: 16,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: 'rgba(109, 66, 216, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SchoolIcon size={18} color="#a78bfa" />
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 16,
                        fontWeight: 800,
                        color: 'var(--ink, #f5f3ff)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sc.name}
                    </div>
                  </div>

                  {sc.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted, #8a8296)',
                        lineHeight: 1.5,
                        marginBottom: 10,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {sc.description}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 11,
                      color: 'var(--muted, #8a8296)',
                    }}
                  >
                    <span>
                      Code:{' '}
                      <strong style={{ color: '#a78bfa', fontWeight: 800 }}>
                        {sc.code}
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
                      {classCount} {classCount === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: 'var(--muted, #8a8296)',
                      fontStyle: 'italic',
                    }}
                  >
                    <span>
                      Owner:{' '}
                      {owner?.displayName || owner?.username || 'You'}
                    </span>
                    <ChevronRight size={16} color="#a78bfa" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}