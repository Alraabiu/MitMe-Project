// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Loader2,
  Check,
  Clock,
} from 'lucide-react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { MeetingRoom } from '../meetings/MeetingRoom';
import type { Meeting, User } from '../../types';

interface Invite {
  kind: 'meeting' | 'class';
  code: string;
}

interface Props {
  invite: Invite;
  user: User;
  onExit: () => void;
}

type State =
  | { kind: 'loading' }
  | { kind: 'meeting'; meeting: Meeting }
  | { kind: 'class-pending'; className: string }
  | { kind: 'class-joined'; className: string; classId: string }
  | { kind: 'error'; message: string };

export function JoinPage({ invite, user, onExit }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  /* ── Meeting or class — kick off the join flow ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (invite.kind === 'meeting') {
          // MeetingRoom will call /meetings/:id/join itself,
          // so we just fetch the meeting document and mount it.
          const g = await api.get<{ meeting: Meeting }>(
            `/meetings/${invite.code}`
          );
          if (cancelled) return;
          setState({ kind: 'meeting', meeting: g.data.meeting });
          return;
        }

        // Class join
        const r = await api.post('/classes/join', { code: invite.code });
        const status = r.data?.status ?? 'joined';
        const cls = r.data?.data?.class ?? r.data?.class;
        const className = cls?.name || 'the class';
        const classId = cls?._id ? String(cls._id) : '';

        if (cancelled) return;

        if (status === 'pending') {
          setState({ kind: 'class-pending', className });

          const socket = getSocket();
          if (socket) {
            socket.on('class:approved', (p: any) => {
              if (String(p?.classId) !== classId) return;
              setState({ kind: 'class-joined', className, classId });
            });
            socket.on('class:rejected', (p: any) => {
              if (String(p?.classId) !== classId) return;
              setState({
                kind: 'error',
                message: 'Your request to join was declined.',
              });
            });
          }
        } else {
          setState({ kind: 'class-joined', className, classId });
        }
      } catch (e: any) {
        if (cancelled) return;
        setState({
          kind: 'error',
          message:
            e?.response?.data?.message ||
            e?.message ||
            'Unable to join. Check the code and try again.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invite.kind, invite.code]);

  /* ── Meeting: full-screen room ── */
  if (state.kind === 'meeting') {
    return (
      <MeetingRoom
        meeting={state.meeting}
        user={user}
        onLeave={() => {
          window.history.replaceState(null, '', '/');
          onExit();
        }}
      />
    );
  }

  const back = () => {
    window.history.replaceState(null, '', '/');
    onExit();
  };

  /* ── Card view for class-pending / class-joined / loading / error ── */
  return (
    <div className="auth" style={{ padding: 24 }}>
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--surface, #1a1526)',
          border: '1px solid var(--border, #2a2538)',
          borderRadius: 20,
          padding: 32,
          textAlign: 'center',
        }}
      >
        {state.kind === 'loading' && (
          <>
            <Loader2
              size={36}
              color="#a78bfa"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <h2 style={{ marginTop: 16, marginBottom: 6 }}>Joining…</h2>
            <p style={{ color: 'var(--muted, #8a8296)', fontSize: 13 }}>
              Connecting you to the {invite.kind}. Please wait.
            </p>
          </>
        )}

        {state.kind === 'class-pending' && (
          <>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 24,
                background: 'rgba(109, 66, 216, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Clock size={30} color="#a78bfa" />
            </div>
            <h2 style={{ margin: 0 }}>Waiting for approval</h2>
            <p
              style={{
                color: 'var(--muted, #8a8296)',
                fontSize: 13,
                marginTop: 8,
                lineHeight: 1.6,
              }}
            >
              Your request to join <strong>{state.className}</strong> has been
              sent. The school owner will review it shortly.
            </p>
            <button
              onClick={back}
              style={{
                marginTop: 20,
                padding: '10px 20px',
                borderRadius: 10,
                border: '1px solid var(--border, #2a2538)',
                background: 'transparent',
                color: 'var(--ink, #f5f3ff)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Continue to dashboard
            </button>
          </>
        )}

        {state.kind === 'class-joined' && (
          <>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 24,
                background: 'rgba(60, 200, 120, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Check size={32} color="#3cc878" />
            </div>
            <h2 style={{ margin: 0 }}>You're in!</h2>
            <p
              style={{
                color: 'var(--muted, #8a8296)',
                fontSize: 13,
                marginTop: 8,
              }}
            >
              You joined <strong>{state.className}</strong>.
            </p>
            <button
              onClick={back}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                borderRadius: 10,
                border: 0,
                background: 'linear-gradient(135deg, #6d42d8, #4f7cf6)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Go to Education
            </button>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 24,
                background: 'rgba(221, 51, 51, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={32} color="#ff8a8a" />
            </div>
            <h2 style={{ margin: 0 }}>Couldn't join</h2>
            <p
              style={{
                color: 'var(--muted, #8a8296)',
                fontSize: 13,
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {state.message}
            </p>
            <button
              onClick={back}
              style={{
                marginTop: 20,
                padding: '10px 20px',
                borderRadius: 10,
                border: '1px solid var(--border, #2a2538)',
                background: 'transparent',
                color: 'var(--ink, #f5f3ff)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}