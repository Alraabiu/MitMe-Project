import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

/* =========================================================
   ENVIRONMENT DETECTION
   ========================================================= */

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants.appOwnership as string | undefined) === 'expo';

/* =========================================================
   LAZY MODULE LOADER
   =========================================================
   We do NOT call GoogleSignin.configure() at module load time.
   React Native's native bridge may not be ready that early, which
   causes the native GoogleSignin module to reject the config and
   later throw "apiClient is null - call configure() first".
   Instead, we lazily configure right before first use.
*/

let GoogleSignin: any = null;
let statusCodes: any = {};
let configured = false;

function loadNativeModule(): boolean {
  if (GoogleSignin) return true;
  if (isExpoGo) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod?.GoogleSignin ?? null;
    statusCodes = mod?.statusCodes ?? {};
    return Boolean(GoogleSignin);
  } catch (err) {
    console.warn('[GoogleAuth] Native module not available:', err);
    GoogleSignin = null;
    statusCodes = {};
    return false;
  }
}

function ensureConfigured(): void {
  if (configured) return;
  if (!loadNativeModule() || !GoogleSignin) {
    throw new Error('Google Sign-In native module is not available.');
  }

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId || !webClientId.endsWith('.apps.googleusercontent.com')) {
    console.error(
      '[GoogleAuth] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing or malformed:',
      webClientId
    );
    throw new Error(
      'Google Sign-In is not configured on this build. Missing web client ID.'
    );
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });

  configured = true;
  console.log('[GoogleAuth] Configured with webClientId:', webClientId.slice(0, 20) + '...');
}

/* =========================================================
   RESPONSE TYPES
   ========================================================= */

interface GoogleAuthResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: User;
  };
}

/* =========================================================
   HOOK
   ========================================================= */

export function useGoogleAuth() {
  const { login } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (googleLoading) return;

    if (isExpoGo) {
      Alert.alert(
        'Google Sign-In',
        'Google Sign-In is only available in the installed app, not in Expo Go. Please install the APK to use this feature.'
      );
      return;
    }

    setGoogleLoading(true);

    try {
      // Configure lazily — after the native bridge is ready
      ensureConfigured();

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const userInfo = await GoogleSignin.signIn();

      const idToken =
        (userInfo as any)?.idToken ||
        (userInfo as any)?.data?.idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google.');
      }

      const r = await api.post<GoogleAuthResponse>('/auth/google', { idToken });

      const payload = (r?.data as any)?.data ?? r?.data;
      const access = payload?.accessToken;
      const refresh = payload?.refreshToken;
      const user = payload?.user;

      if (!access || !user) {
        console.log('[GOOGLE AUTH] Unexpected response:', r?.data);
        throw new Error('Unexpected response from server.');
      }

      await login(access, refresh ?? '', user);
    } catch (error: any) {
      const code = error?.code;

      if (code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — no alert
      } else if (code === statusCodes.IN_PROGRESS) {
        console.log('Google Sign-In already in progress.');
      } else if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'MitMe',
          'Google Play Services is not available on this device. Please install it from the Play Store and try again.'
        );
      } else {
        console.log('[GOOGLE AUTH ERROR]', error);
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Google Sign-In failed. Please try again.';
        Alert.alert('MitMe', msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, login]);

  return { signInWithGoogle, googleLoading };
}
