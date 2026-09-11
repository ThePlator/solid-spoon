import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { subscribeFeed, signOut, currentUser, type Save } from '@supermind/core';
import { C, RADIUS } from '../src/theme';

function fmtSince(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProfileScreen() {
  const user = currentUser();
  const [feed, setFeed] = useState<Save[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFeed(user.uid, setFeed, 500);
  }, [user?.uid]);

  const stats = useMemo(() => {
    const links = feed.filter((s) => s.type === 'link').length;
    const tags = new Set<string>();
    feed.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return { total: feed.length, links, thoughts: feed.length - links, tags: tags.size };
  }, [feed]);

  const initial = (user?.email?.[0] ?? '?').toUpperCase();

  function confirmSignOut() {
    Alert.alert('Sign out', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
      <View style={s.identity}>
        <View style={s.avatar}><Text style={s.avatarTxt}>{initial}</Text></View>
        <Text style={s.email}>{user?.email ?? 'Signed in'}</Text>
        <Text style={s.since}>Member since {fmtSince(user?.metadata?.creationTime)}</Text>
      </View>

      <Text style={s.section}>Library</Text>
      <View style={s.grid}>
        <Stat n={stats.total} k="Entries" />
        <Stat n={stats.links} k="Links" />
        <Stat n={stats.thoughts} k="Thoughts" />
        <Stat n={stats.tags} k="Tags" />
      </View>

      <Text style={s.section}>Account</Text>
      <View style={s.card}>
        <Row label="Email" value={user?.email ?? '—'} />
        <Row label="User ID" value={(user?.uid ?? '').slice(0, 12) + '…'} last />
      </View>

      <TouchableOpacity style={s.signout} onPress={confirmSignOut}>
        <Text style={s.signoutTxt}>Sign out</Text>
      </TouchableOpacity>

      <Text style={s.footer}>MIND·OS · v0.1{'\n'}Your data lives in your own Firebase.</Text>
    </ScrollView>
  );
}

function Stat({ n, k }: { n: number; k: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statN}>{n}</Text>
      <Text style={s.statK}>{k}</Text>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16 },
  identity: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: C.accentInk, fontSize: 32, fontWeight: '800' },
  email: { color: C.fg, fontSize: 17, fontWeight: '600', marginTop: 14 },
  since: { color: C.fg3, fontSize: 13, marginTop: 4 },
  section: { color: C.fg3, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginTop: 24, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexGrow: 1, flexBasis: '46%', backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, padding: 16 },
  statN: { color: C.fg, fontSize: 28, fontWeight: '800' },
  statK: { color: C.fg3, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 },
  card: { backgroundColor: C.bg2, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, paddingHorizontal: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomColor: C.line, borderBottomWidth: 1 },
  rowLabel: { color: C.fg3, fontSize: 14 },
  rowValue: { color: C.fg, fontSize: 14, maxWidth: '65%' },
  signout: { marginTop: 28, borderColor: C.danger, borderWidth: 1, borderRadius: RADIUS, padding: 15, alignItems: 'center' },
  signoutTxt: { color: C.danger, fontWeight: '700', fontSize: 15 },
  footer: { color: C.fg3, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
