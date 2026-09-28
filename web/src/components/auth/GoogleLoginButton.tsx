import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useState } from 'react';
import { api, setToken } from '../../services/api';
import type { User } from '../../types';

interface Props {
  onSuccess: (user: User) => void;
  onError?: (message: string) => void;
}

export function GoogleLoginButton({ onSuccess, onError }: Props) {
  const [busy, setBusy] = useState(false);
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as
    | string
    | undefined;

  if (!clientId) {
    return (
      <div className="googleLoginError">
        Google Sign-In is not configured. Missing VITE_GOOGLE_CLIENT_ID.
      </div>
    );
  }

  const handleSuccess = async (credential: CredentialResponse) => {
    if (!credential?.credential) {
      onError?.('Google did not return an ID token.');
      return;
    }

    setBusy(true);
    try {
      const r = await api.post('/auth/google', {
        idToken: credential.credential,
      });

      const payload = (r?.data as any)?.data ?? r?.data;

      if (!payload?.accessToken || !payload?.user) {
        console.error('[GOOGLE WEB] Unexpected response:', r?.data);
        onError?.('Unexpected response from server.');
        return;
      }

      setToken(payload.accessToken, payload.refreshToken ?? null);
      onSuccess(payload.user);
    } catch (err: any) {
      console.error('[GOOGLE WEB ERROR]', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Google Sign-In failed. Please try again.';
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="googleLoginWrap">
      <div className="googleLoginDivider">
        <span>or continue with</span>
      </div>

      <div
        style={{
          opacity: busy ? 0.6 : 1,
          pointerEvents: busy ? 'none' : 'auto',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => onError?.('Google Sign-In failed.')}
          useOneTap={false}
          shape="rectangular"
          size="large"
          text="continue_with"
        />
      </div>
    </div>
  );
}
