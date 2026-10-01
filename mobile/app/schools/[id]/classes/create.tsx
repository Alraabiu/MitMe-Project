import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { createClassInSchool } from '../../../../src/services/schools';
import { useTheme } from '../../../../src/context/ThemeContext';
import { spacing, radii, font, type ThemePalette } from '../../../../src/theme';

export default function CreateClassInSchoolScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const submit = async () => {
    if (!id) {
      return Alert.alert('MitMe', 'Missing school ID.');
    }
    if (!name.trim() || name.trim().length < 2) {
      return Alert.alert('MitMe', 'Class name must be at least 2 characters.');
    }

    setBusy(true);
    try {
      const cls = await createClassInSchool(String(id), {
        name: name.trim(),
        subject: subject.trim() || undefined,
      });

      Alert.alert(
        'Class Created',
        `"${cls.name}" is ready.\n\nJoin code: ${cls.joinCode || cls.code}\n\nShare this with anyone you want to invite.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        'MitMe',
        e?.response?.data?.message ||
          e?.message ||
          'Unable to create class.'
      );
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
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>

          <Text style={s.title}>Create Class</Text>
          <Text style={s.sub}>
            A unique join code will be generated. Share it with anyone you
            want to invite — they'll request to join and you approve.
          </Text>

          <Text style={s.label}>Class name *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Class 1"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            editable={!busy}
            autoFocus
            maxLength={120}
          />

          <Text style={s.label}>Subject (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Mathematics"
            placeholderTextColor={colors.muted}
            value={subject}
            onChangeText={setSubject}
            editable={!busy}
            maxLength={60}
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
    backText: {
      color: colors.purple,
      fontWeight: '800',
      fontSize: 14,
      marginBottom: spacing.md,
    },
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
      lineHeight: 20,
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