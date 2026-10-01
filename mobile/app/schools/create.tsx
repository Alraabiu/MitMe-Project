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
import { createSchool } from '../../src/services/schools';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing, radii, font, type ThemePalette } from '../../src/theme';

export default function CreateSchoolScreen() {
  const router = useRouter();
  const { colors, gradients } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      return Alert.alert('MitMe', 'School name must be at least 2 characters.');
    }

    setBusy(true);
    try {
      const school = await createSchool({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      Alert.alert(
        'School Created',
        `"${school.name}" is ready.\n\nSchool code: ${school.code}\n\nNext: create your first class.`,
        [
          {
            text: 'Open School',
            onPress: () => router.replace(`/schools/${school._id}`),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert(
        'MitMe',
        e?.response?.data?.message ||
          e?.message ||
          'Unable to create school.'
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
          <Text style={s.title}>Create School</Text>
          <Text style={s.sub}>
            Give your school a name. You'll be its owner and can add classes
            and approve students.
          </Text>

          <Text style={s.label}>School name *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Greenfield Academy"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            editable={!busy}
            autoFocus
            maxLength={120}
          />

          <Text style={s.label}>Description (optional)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="What is this school about?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!busy}
            maxLength={500}
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
                <Text style={s.btnText}>Create School</Text>
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
    textarea: { minHeight: 100, textAlignVertical: 'top' },
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