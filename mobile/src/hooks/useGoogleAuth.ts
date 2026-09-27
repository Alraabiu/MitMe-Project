import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Constants from 'expo-constants';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants.appOwnership as string | undefined) === 'expo';

let GoogleSignin: any = null;
let statusCodes: any = {};

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod?.GoogleSignin ?? null;
    statusCodes = mod?.statusCodes ?? {};

    if (GoogleSignin && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    }
  } catch {
    GoogleSignin = null;
    statusCodes = {};
  }
}

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

export function useGoogleAuth() {
  const { login } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (googleLoading) return;

    if (!GoogleSignin) {
      Alert.alert(
        'Google Sign-In',
        'Google Sign-In is only available in the installed app, not in Expo Go. Please install the APK to use this feature.'
      );
      return;
    }

    setGoogleLoading(true);

    try {
      await GoogleSignin.hasPlayServices();

      const userInfo = await GoogleSignin.signIn();
      const idToken =
        (userInfo as any)?.idToken || (userInfo as any)?.data?.idToken;

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
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled by user
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        console.log('Google Sign-In already in progress.');
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(
          'MitMe',
          'Google Play Services is not available on this device.'
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
