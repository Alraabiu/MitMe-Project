// @ts-nocheck
import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './services/api';
import { AuthPage } from './components/auth/AuthPage';
import { Shell } from './components/layout/Shell';
import { Logo } from './components/common/Logo';
import { usePresence } from './hooks/usePresence';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Track presence whenever a user is logged in
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

  if (!user) return <AuthPage onLogin={setUser} />;

  return <Shell user={user} setUser={setUser} isOnline={isOnline} />;
}