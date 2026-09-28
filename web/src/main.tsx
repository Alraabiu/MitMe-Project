// @ts-ignore: React types are unavailable in this project.
import React from 'react';
// @ts-ignore: react-dom/client types are unavailable in this project.
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
// The bundler handles this stylesheet import; TypeScript has no declaration for CSS files.
// @ts-ignore
import './styles/theme.css';

import './styles/classes.css';

/**
 * Google OAuth client ID.
 * Read from Vite env (VITE_GOOGLE_CLIENT_ID in .env).
 * Falls back to empty string — GoogleLoginButton shows an
 * error state if it's missing rather than crashing the app.
 */
const GOOGLE_CLIENT_ID =
  (import.meta as unknown as { env?: { VITE_GOOGLE_CLIENT_ID?: string } })
    .env?.VITE_GOOGLE_CLIENT_ID || '';

if (!GOOGLE_CLIENT_ID) {
  console.warn(
    '[MitMe] VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In on web will not work until you add it to .env'
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(GoogleOAuthProvider, {
      clientId: GOOGLE_CLIENT_ID,
      children: React.createElement(App),
    })
  )
);