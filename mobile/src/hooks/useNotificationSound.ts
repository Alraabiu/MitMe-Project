import { useCallback } from 'react';
import { Platform, Vibration } from 'react-native';

type SoundType = 'request' | 'message' | 'admit' | 'leave';

/**
 * Plays notification feedback on mobile using native vibration.
 * Distinct vibration patterns for different events so users can
 * tell them apart without looking at the screen.
 */
export function useNotificationSound() {
  const play = useCallback((type: SoundType = 'request') => {
    if (Platform.OS === 'web') return;

    try {
      switch (type) {
        case 'request':
          // Three-buzz pattern — "someone is knocking"
          Vibration.vibrate([0, 120, 80, 120, 80, 180]);
          break;

        case 'message':
          // Short double pulse
          Vibration.vibrate([0, 80, 80, 80]);
          break;

        case 'admit':
          // Two short pulses — "you've been admitted"
          Vibration.vibrate([0, 60, 60, 60]);
          break;

        case 'leave':
          // Single long buzz
          Vibration.vibrate(300);
          break;
      }
    } catch {
      /* vibration unavailable */
    }
  }, []);

  const unlock = useCallback(() => {
    // No-op on mobile (native vibration doesn't need unlocking)
  }, []);

  return { play, unlock };
}