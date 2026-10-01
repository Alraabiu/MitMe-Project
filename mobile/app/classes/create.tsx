import { useMemo, useState } from 'react';
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
import { createClass } from '../../src/services/classes';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing, radii, font, type ThemePalette } from '../../src/theme';

export default function CreateClassScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      return Alert.alert('MitMe', 'Class name must be at least 2 characters.');
    }

    setBusy(true);
    try {
      const cls = await createClass({
        name: name.trim(),
        subject: subject.trim() || undefined,
      });

      Alert.alert(
        'Class Created',
        `Your class code is:\n\n${cls.code}\n\nShare this code with anyone you want to invite.`,
        [{ text: 'OK', onPress: () => router.replace(`/classes/${cls._id}`) }]
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to create class.';
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
          <Text style={s.title}>Create Class</Text>
          <Text style={s.sub}>
            Share the class code with anyone you want to invite.
          </Text>

          <Text style={s.label}>Class name *</Text>
          <TextInput
            style={s.input}
            placeholder="Class Name"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            editable={!busy}
          />

          <Text style={s.label}>Subject (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="Subject"
            placeholderTextColor={colors.muted}
            value={subject}
            onChangeText={setSubject}
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
                <Text style={s.btnText}>Create Class</Text>
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

const makeStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 40 },
    title: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.ink,
      marginBottom: 4,
    },
    sub: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: spacing.xl,
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.ink,
      marginBottom: 6,
      marginTop: spacing.md,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      fontSize: font.md,
      color: colors.ink,
    },
    btn: {
      borderRadius: radii.md,
      overflow: 'hidden',
      marginTop: spacing.xl,
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