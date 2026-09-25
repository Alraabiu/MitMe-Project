import { useState } from 'react';
import { api, setToken } from '../../services/api';
import type { AuthResponse, User } from '../../types';
import { Logo } from '../common/Logo';

interface AuthPageProps {
  onLogin: (user: User) => void;
}

type Mode = 'login' | 'register';

interface FormState {
  displayName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
}

interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

interface ApiErrorBody {
  message?: string;
  issues?: ValidationIssue[];
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [form, setForm] = useState<FormState>({
    displayName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update =
    (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const url = mode === 'login' ? '/auth/login' : '/auth/register';

      // ─── Build a clean payload ───────────────────────────────
      // Never send empty strings for optional fields — Zod rejects them.
      let body: Record<string, string>;

      if (mode === 'login') {
        body = {
          identifier: (form.email || form.username).trim(),
          password: form.password,
        };
      } else {
        body = {
          displayName: form.displayName.trim(),
          username: form.username.trim(),
          password: form.password,
        };
        if (form.email.trim()) body.email = form.email.trim();
        if (form.phone.trim()) body.phone = form.phone.trim();
      }

      const { data } = await api.post<AuthResponse>(url, body);
      setToken(data.accessToken, data.refreshToken);
      onLogin(data.user);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: ApiErrorBody } };
      const body = apiErr.response?.data;
      const baseMessage = body?.message || 'Unable to continue';
      const detail = body?.issues?.length
        ? ' — ' +
          body.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('; ')
        : '';
      setError(baseMessage + detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
       <Logo variant="full" height={110} />
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your MitMe account'}</h1>
        <p className="muted">
          Meet people, collaborate and share from one place.
        </p>

        <form className="form" onSubmit={submit}>
          {mode === 'register' && (
            <>
              <input
                className="input"
                placeholder="Full name"
                value={form.displayName}
                onChange={update('displayName')}
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
              <input
                className="input"
                placeholder="Username"
                value={form.username}
                onChange={update('username')}
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_.\-]+"
                title="Letters, numbers, dot, dash and underscore only"
              />
            </>
          )}

          <input
            className="input"
            placeholder={mode === 'login' ? 'Email or username' : 'Email'}
            value={form.email}
            onChange={update('email')}
            autoComplete={mode === 'login' ? 'username' : 'email'}
            type={mode === 'login' ? 'text' : 'email'}
          />

          {mode === 'register' && (
            <input
              className="input"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={update('phone')}
              autoComplete="tel"
              type="tel"
            />
          )}

          <input
            className="input"
            type="password"
            placeholder="Password (8+ characters)"
            value={form.password}
            onChange={update('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />

          {error && <div className="error">{error}</div>}

          <button
            className="btn primary"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        <div className="login-switch">
          {mode === 'login' ? 'New to MitMe?' : 'Already have an account?'}{' '}
          <button className="btn" onClick={switchMode} type="button">
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}