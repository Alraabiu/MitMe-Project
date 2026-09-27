import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Conversation } from '../../src/types';

export default function MessagesTab() {
  const router = useRouter();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConvos(r.data.conversations);
    } catch (e: any) {
      Alert.alert('MitMe', e?.response?.data?.message || 'Could not load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const titleFor = (c: Conversation) => {
    if (c.type === 'group') return c.title || 'Group chat';
    const other = c.members.find((m) => m._id !== user?._id);
    return other?.displayName || 'Conversation';
  };

  const subtitleFor = (c: Conversation) => {
    if (c.type === 'group') return `${c.members.length} members`;
    const other = c.members.find((m) => m._id !== user?._id);
    return other?.username ? `@${other.username}` : 'Chat';
  };

  const openConvo = (c: Conversation) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: c._id, title: titleFor(c) },
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.h1}>Messages</Text>
        <Pressable style={s.newBtn} onPress={() => router.push('/chat/new')}>
          <Text style={s.newBtnText}>New chat</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : convos.length === 0 ? (
        <View style={s.center}>
          <MessageCircle size={48} color={colors.muted} opacity={0.4} />
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptyText}>
            Tap "New chat" to start talking with someone.
          </Text>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(c) => c._id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && s.rowPressed]}
              onPress={() => openConvo(item)}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {titleFor(item).slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>
                  {titleFor(item)}
                </Text>
                <Text style={s.sub} numberOfLines={1}>
                  {subtitleFor(item)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  h1: { fontSize: font.xxl, fontWeight: '800', color: colors.ink },
  newBtn: {
    backgroundColor: colors.purple,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  newBtnText: { color: '#fff', fontWeight: '800' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptyText: {
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
  },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    ...shadows.sm,
  },
  rowPressed: { opacity: 0.85 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: font.lg },
  name: { fontWeight: '800', color: colors.ink, fontSize: font.md },
  sub: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
});
