import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, UserPlus, Check } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { User } from '../../src/types';

interface ContactRequest {
  _id: string;
  from: User;
  createdAt?: string;
}

export default function ContactsTab() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const r = await api.get<{ requests: ContactRequest[] }>(
        '/contacts/requests'
      );
      setRequests(r.data.requests);
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const search = async () => {
    if (q.trim().length < 2) {
      return Alert.alert('MitMe', 'Type at least 2 characters.');
    }
    setSearching(true);
    try {
      const r = await api.get<{ users: User[] }>(
        `/users?q=${encodeURIComponent(q.trim())}`
      );
      setResults(r.data.users);
      if (r.data.users.length === 0) {
        Alert.alert('MitMe', 'No users found.');
      }
    } catch {
      Alert.alert('MitMe', 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (target: User) => {
    setBusy(target._id);
    try {
      await api.post('/contacts/requests', { userId: target._id });
      Alert.alert('MitMe', `Request sent to ${target.displayName}.`);
    } catch (e: any) {
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Could not send request.'
      );
    } finally {
      setBusy(null);
    }
  };

  const acceptRequest = async (req: ContactRequest) => {
    setBusy(req._id);
    try {
      await api.post(`/contacts/requests/${req._id}/accept`);
      setRequests((prev) => prev.filter((r) => r._id !== req._id));
      Alert.alert('MitMe', `You're now connected with ${req.from.displayName}.`);
    } catch (e: any) {
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Could not accept request.'
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.h1}>Contacts</Text>
      </View>

      {/* Pending requests */}
      {requests.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Pending requests ({requests.length})
          </Text>
          {requests.map((r) => (
            <View key={r._id} style={s.requestRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {r.from.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.from.displayName}</Text>
                <Text style={s.sub}>@{r.from.username}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  s.acceptBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => acceptRequest(r)}
                disabled={busy === r._id}
              >
                <Check size={16} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.input}
          placeholder="Find people by name or @username"
          placeholderTextColor={colors.muted}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          autoCapitalize="none"
        />
        <Pressable style={s.searchBtn} onPress={search} disabled={searching}>
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Search size={18} color="#fff" />
          )}
        </Pressable>
      </View>

      {/* Results */}
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
                {q.length > 0
                  ? 'No results yet. Try searching.'
                  : 'Search for people to add as contacts.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {item.displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={s.sub} numberOfLines={1}>
                  @{item.username}
                  {item.presence ? ` ? ${item.presence}` : ''}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.85 }]}
                onPress={() => sendRequest(item)}
                disabled={busy === item._id}
              >
                <UserPlus size={16} color="#fff" />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  h1: { fontSize: font.xxl, fontWeight: '800', color: colors.ink },
  section: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: font.md,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  requestRow: {
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
  searchWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
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
  addBtn: {
    backgroundColor: colors.blue,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: colors.green,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  emptyWrap: { padding: spacing.xxl, alignItems: 'center' },
  empty: { color: colors.muted, textAlign: 'center', maxWidth: 260 },
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
