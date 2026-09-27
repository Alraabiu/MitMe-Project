import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { MessageNotificationsProvider } from '../src/context/MessageNotificationsContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MessageNotificationsProvider>
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
        </MessageNotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
