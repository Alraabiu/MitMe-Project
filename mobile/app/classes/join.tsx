import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { joinClass } from '../../src/services/classes';
import { colors, spacing, radii, font, shadows } from '../../src/theme';

export default function JoinClassScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length < 6) {
      return Alert.alert('MitMe', 'Enter a valid class code.');
    }

    setBusy(true);
    try {
      const cls = await joinClass(trimmed);
      Alert.alert(
        'Joined!',
        `You joined ${cls.name}.`,
        [{ text: 'OK', onPress: () => router.replace(`/classes/${cls._id}`) }]
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to join class.';
      Alert.alert('MitMe', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.title}>Join a Class</Text>
          <Text style={s.sub}>
            Ask your teacher for the class code and enter it below.
          </Text>

          <TextInput
            style={[s.input, s.codeInput]}
            placeholder="ABC-DEF"
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            editable={!busy}
          />

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [
              s.btn,
              pressed && { opacity: 0.9 },
              busy && { opacity: 0.7 },
            ]}
          >
            <LinearGradient
              colors={[colors.purple, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btnInner}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Join Class</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            disabled={busy}
            style={s.cancel}
          >
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 40, justifyContent: 'center', flexGrow: 1 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 4,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: font.md,
    color: colors.ink,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 4,
  },
  btn: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginTop: spacing.lg,
    ...shadows.card,
  },
  btnInner: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: font.md },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: { color: colors.muted, fontWeight: '700' },
});
