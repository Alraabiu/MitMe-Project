import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';

/**
 * Detect if we're running inside the Expo Go client.
 * Expo Go (SDK 53+) does not support `expo-notifications`,
 * so we skip loading it entirely there.
 */
const IS_EXPO_GO = Constants.appOwnership === 'expo';

let cached: any = undefined;

/**
 * Load expo-notifications only when it's safe to do so.
 * On Expo Go this returns null so we fall back to vibration.
 */
function loadNotifications(): any {
  if (cached !== undefined) return cached;

  if (IS_EXPO_GO) {
    cached = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications');
    cached = mod;
    return mod;
  } catch {
    cached = null;
    return null;
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = loadNotifications();
  if (!N) return false;

  try {
    const settings = await N.getPermissionsAsync();
    if (settings.granted) return true;
    const result = await N.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const N = loadNotifications();

  // Fallback for Expo Go: vibrate instead of a tray notification
  if (!N) {
    try {
      Vibration.vibrate(80);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch {
    /* ignore */
  }
}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const N = loadNotifications();
  if (!N) return;

  try {
    await N.setNotificationChannelAsync('default', {
      name: 'Messages',
      importance: N.AndroidImportance?.HIGH ?? 4,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6d42d8',
    });
  } catch {
    /* ignore */
  }
}

export function configureNotificationHandler(): void {
  const N = loadNotifications();
  if (!N) return;

  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    /* ignore */
  }
}
