import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { MessageNotificationsProvider } from '../src/context/MessageNotificationsContext';
import { useAppReady } from '../src/hooks/useAppReady';

// ─── WebRTC globals (dev build / APK only) ──────────────
// Expo Go does NOT include the WebRTC native module.
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webrtc = require('@livekit/react-native-webrtc');
    webrtc.registerGlobals?.();
  } catch (err) {
    console.warn('[MitMe] WebRTC native module unavailable:', err);
  }
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MessageNotificationsProvider>
          <AppShell />
        </MessageNotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { loading } = useAuth();
  useAppReady(!loading);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" />
        <Stack.Screen
          name="meeting"
          options={{ presentation: 'fullScreenModal' }}
        />
      </Stack>
    </>
  );
}