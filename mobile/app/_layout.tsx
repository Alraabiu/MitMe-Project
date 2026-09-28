// Must be the very first import — registers native WebRTC globals
import '@livekit/react-native-webrtc';
import { registerGlobals } from '@livekit/react-native-webrtc';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { MessageNotificationsProvider } from '../src/context/MessageNotificationsContext';
import { useAppReady } from '../src/hooks/useAppReady';

registerGlobals();

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

/**
 * Renders the navigation stack.
 * Keeps the native splash visible until the auth state has loaded.
 */
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