import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// Detect if running inside Expo Go (storeClient).
// In Expo Go, native modules like RNGoogleSignin are NOT available.
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants.appOwnership as string | undefined) === 'expo';

// Only require the native module when NOT in Expo Go.
let NativeButton: any = null;
let signInFn: any = null;

if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-google-signin/google-signin');
    NativeButton = mod?.GoogleSigninButton ?? null;
    if (mod?.GoogleSignin && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
      mod.GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: false,
      });
    }
  } catch {
    NativeButton = null;
  }
}

export function GoogleButton({ onPress, loading, disabled }: Props) {
  const isDisabled = disabled || loading;

  return (
    <View style={styles.wrapper}>
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : NativeButton ? (
        <NativeButton
          size={2 /* Wide */}
          color={0 /* Light */}
          onPress={onPress}
          disabled={isDisabled}
          style={styles.button}
        />
      ) : (
        <Pressable
          onPress={onPress}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.fallbackBtn,
            pressed && { opacity: 0.85 },
            isDisabled && { opacity: 0.5 },
          ]}
        >
          <Text style={styles.gText}>G</Text>
          <Text style={styles.fallbackText}>Continue with Google</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
  },
  fallbackBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DADCE0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  gText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
  },
  fallbackText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3C4043',
  },
});
