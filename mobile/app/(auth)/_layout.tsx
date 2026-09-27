import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useEffect } from 'react';
import { rehydrateToken } from '../../src/services/api';

export default function AuthLayout() {
  const { user } = useAuth();

  useEffect(() => {
    rehydrateToken();
  }, []);

  // Already authenticated? Skip the auth screens entirely.
  if (user) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}