import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Branded Google Sign-In button.
 *
 * We deliberately DO NOT use the native `GoogleSigninButton` from
 * @react-native-google-signin/google-signin because its codegen spec
 * has changed between versions (v13: number props, v16: string props).
 * Passing the wrong type crashes the native view manager with:
 *   java.lang.ClassCastException: Double cannot be cast to String
 *
 * Instead, we render our own button and trigger GoogleSignin.signIn()
 * ourselves (in useGoogleAuth.ts). This is version-proof.
 */
export function GoogleButton({ onPress, loading, disabled }: Props) {
  const isDisabled = disabled || loading;

  return (
    <View style={styles.wrapper}>
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
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
