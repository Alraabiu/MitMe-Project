// @ts-nocheck
import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './services/api';
import { AuthPage } from './components/auth/AuthPage';
import { Shell } from './components/layout/Shell';
import { Logo } from './components/common/Logo';
import { usePresence } from './hooks/usePresence';
import { JoinPage } from './components/join/JoinPage';
import type { User } from './types';

/* ─── Detect an invite URL and extract its code ──────── */

interface Invite {
  kind: 'meeting' | 'class';
  code: string;
}

function detectInvite(): Invite | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname || '';

  const meetMatch = path.match(/^\/meet\/([A-Z0-9-]+)$/i);
  if (meetMatch) {
    return { kind: 'meeting', code: meetMatch[1].toUpperCase() };
  }

  const classMatch = path.match(/^\/join\/([A-Z0-9-]+)$/i);
  if (classMatch) {
    return { kind: 'class', code: classMatch[1].toUpperCase() };
  }

  return null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(() => detectInvite());
  const [inviteConsumed, setInviteConsumed] = useState(false);

  const isOnline = usePresence(Boolean(user));

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setToken(null, null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="auth">
        <Logo />
      </div>
    );
  }

  /* Not signed in → auth (invite stays pending in state) */
  if (!user) {
    return <AuthPage onLogin={setUser} />;
  }

  /* Signed in + active invite → JoinPage */
  if (invite && !inviteConsumed) {
    return (
      <JoinPage
        invite={invite}
        user={user}
        onExit={() => {
          setInviteConsumed(true);
          setInvite(null);
        }}
      />
    );
  }

  return <Shell user={user} setUser={setUser} isOnline={isOnline} />;
}