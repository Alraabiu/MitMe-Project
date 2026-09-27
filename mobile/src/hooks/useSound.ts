import { useCallback } from 'react';
import { Vibration, Platform } from 'react-native';

type Sound = 'message' | 'sent' | 'success' | 'error';

/**
 * Notification feedback using native vibration.
 * - message: double pulse (someone messaged you)
 * - sent: single short pulse (your message delivered)
 * - success: short pulse
 * - error: long pulse
 */
export function useSound() {
  const play = useCallback((sound: Sound) => {
    if (Platform.OS === 'web') return;

    switch (sound) {
      case 'message':
        Vibration.vibrate([0, 80, 80, 80]);
        break;
      case 'sent':
        Vibration.vibrate(40);
        break;
      case 'success':
        Vibration.vibrate(30);
        break;
      case 'error':
        Vibration.vibrate([0, 200, 100, 200]);
        break;
    }
  }, []);

  return { play };
}
