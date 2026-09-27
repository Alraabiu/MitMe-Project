import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Conversation, User } from '../../src/types';

export default function NewChatScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      const r = await api.get<{ users: User[] }>(
        `/users?q=${encodeURIComponent(q.trim())}`
      );
      setResults(r.data.users);
    } catch {
      /* ignore */
    } finally {
      setSearching(false);
    }
  };

  const startWith = async (other: User) => {
    try {
      const r = await api.post<{ conversation: Conversation }>('/conversations', {
        type: 'direct',
        memberIds: [other._id],
      });
      router.replace({
        pathname: '/chat/[id]',
        params: { id: r.data.conversation._id, title: other.displayName },
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <Text style={s.title}>New chat</Text>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.input}
          placeholder="Search users by name or @username"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          autoCapitalize="none"
          autoFocus
        />
        <Pressable style={s.searchBtn} onPress={search}>
          <Search size={18} color="#fff" />
        </Pressable>
      </View>

      {searching ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u._id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.empty}>
                {q.length < 2
                  ? 'Type at least 2 characters to search.'
                  : 'No users found.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
              onPress={() => startWith(item)}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {item.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={s.name}>{item.displayName}</Text>
                <Text style={s.sub}>@{item.username}</Text>
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
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: { padding: spacing.xs },
  title: { fontSize: font.lg, fontWeight: '800', color: colors.ink },
  searchWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: font.md,
    color: colors.ink,
  },
  searchBtn: {
    backgroundColor: colors.purple,
    width: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg },
  emptyWrap: { padding: spacing.xxl, alignItems: 'center' },
  empty: { color: colors.muted, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: font.lg },
  name: { fontWeight: '700', color: colors.ink },
  sub: { color: colors.muted, fontSize: font.sm },
});
