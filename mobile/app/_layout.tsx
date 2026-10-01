import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { MessageNotificationsProvider } from '../src/context/MessageNotificationsContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { useAppReady } from '../src/hooks/useAppReady';

// ─── WebRTC / LiveKit native bootstrap ──────────────────
// Must run BEFORE any LiveKit code. Expo Go doesn't include the
// native modules, so we skip it there.
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  try {
    // registerGlobals lives in @livekit/react-native (NOT the webrtc fork).
    // It installs RTCPeerConnection, MediaStream, etc. into the JS runtime.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lk = require('@livekit/react-native');
    lk.registerGlobals?.();
    console.log('[MitMe] LiveKit globals registered ✅');
  } catch (err) {
    console.error('[MitMe] Failed to register LiveKit globals:', err);
  }
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <MessageNotificationsProvider>
            <AppShell />
          </MessageNotificationsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
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