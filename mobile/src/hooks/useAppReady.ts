import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto-hide immediately when the app boots
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Returns true once the app is ready to be shown.
 * Call this at the top of your root layout.
 */
export function useAppReady(isReady: boolean) {
  const [hasHidden, setHasHidden] = useState(false);

  useEffect(() => {
    if (!isReady || hasHidden) return;
    SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() => setHasHidden(true));
  }, [isReady, hasHidden]);

  return hasHidden;
}