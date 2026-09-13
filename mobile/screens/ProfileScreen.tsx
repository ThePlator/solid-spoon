import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeFeed, signOut, resetPassword, deleteSave, setEnrichEnabled, currentUser, type Save } from '@supermind/core';
import { AUTO_SUMMARIZE_KEY } from '../src/firebase';
import { C, RADIUS } from '../src/theme';

function fmtSince(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProfileScreen() {
  const user = currentUser();
  const [feed, setFeed] = useState<Save[]>([]);
  const [autoSummarize, setAutoSummarize] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeFeed(user.uid, setFeed, 500);
  }, [user?.uid]);

  useEffect(() => {
    AsyncStorage.getItem(AUTO_SUMMARIZE_KEY)
      .then((v) => setAutoSummarize(v !== 'false'))
      .catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const links = feed.filter((s) => s.type === 'link').length;
    const tags = new Set<string>();
    feed.forEach((s) => s.tags.forEach((t) => tags.add(t)));
    return { total: feed.length, links, thoughts: feed.length - links, tags: tags.size };
  }, [feed]);

  const ai = useMemo(() => {
    const summarized = feed.filter((s) => !!s.summary).length;
    const pending = feed.filter((s) => s.enrichStatus === 'pending').length;
    return { summarized, pending };
  }, [feed]);

  const initial = (user?.email?.[0] ?? '?').toUpperCase();

  async function toggleAuto(next: boolean) {
    setAutoSummarize(next);
    setEnrichEnabled(next);
    try { await AsyncStorage.setItem(AUTO_SUMMARIZE_KEY, next ? 'true' : 'false'); } catch {}
  }

  function changePassword() {
    if (!user?.email) return;
    Alert.alert('Change password', `Send a password reset link to ${user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send link',
        onPress: async () => {
          try {
            await resetPassword(user.email!);
            Alert.alert('Email sent', 'Check your inbox for the reset link.');
          } catch {
            Alert.alert('Could not send', 'Please try again in a moment.');
          }
        },
      },
    ]);
  }

  async function copyId() {
    if (!user?.uid) return;
    await Clipboard.setStringAsync(user.uid);
    Alert.alert('Copied', 'User ID copied to clipboard.');
  }

  function deleteEverything() {
    if (!user?.uid || feed.length === 0) { Alert.alert('Nothing to delete'); return; }
    Alert.alert(
      'Delete all entries',
      `This permanently removes all ${feed.length} entries. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            // Second confirmation — this is irreversible.
            Alert.alert('Are you absolutely sure?', 'Every saved link and thought will be erased.', [
              { text: 'Keep my data', style: 'cancel' },
              {
                text: 'Yes, delete everything',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await Promise.all(feed.map((s) => deleteSave(user.uid!, s.id)));
                    Alert.alert('Deleted', 'Your library is now empty.');
                  } catch {
                    Alert.alert('Something went wrong', 'Some entries may remain.');
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  }

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

      <Text style={s.section}>Intelligence</Text>
      <View style={s.grid}>
        <Stat n={ai.summarized} k="Summarized" accent />
        <Stat n={ai.pending} k="Pending" />
      </View>

      <Text style={s.section}>Settings</Text>
      <View style={s.card}>
        <View style={[s.row, s.rowBorder]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.rowLabel}>Auto-summarize</Text>
            <Text style={s.rowHint}>Generate an AI summary + tags when you save</Text>
          </View>
          <Switch
            value={autoSummarize}
            onValueChange={toggleAuto}
            trackColor={{ true: C.accent, false: C.line2 }}
            thumbColor={C.fg}
          />
        </View>
        <Row label="Model" value="gemini-2.5-flash" last />
      </View>
      <Text style={s.note}>The AI model is configured on the server (ENRICH_MODEL).</Text>

      <Text style={s.section}>Account</Text>
      <View style={s.card}>
        <TouchableOpacity style={[s.row, s.rowBorder]} onPress={changePassword}>
          <Text style={s.rowLabel}>Change password</Text>
          <Text style={s.rowAction}>Send link →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.row} onPress={copyId}>
          <Text style={s.rowLabel}>User ID</Text>
          <Text style={s.rowAction}>Copy</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.section}>Danger zone</Text>
      <TouchableOpacity style={s.danger} onPress={deleteEverything}>
        <Text style={s.dangerTxt}>Delete all entries</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.signout} onPress={confirmSignOut}>
        <Text style={s.signoutTxt}>Sign out</Text>
      </TouchableOpacity>

      <Text style={s.footer}>MIND·OS · v0.1{'\n'}Your data lives in your own Firebase.</Text>
    </ScrollView>
  );
}

function Stat({ n, k, accent }: { n: number; k: string; accent?: boolean }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statN, accent && { color: C.accent }]}>{n}</Text>
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
  wrap: { padding: 16, paddingBottom: 48 },
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
  rowLabel: { color: C.fg, fontSize: 15 },
  rowHint: { color: C.fg3, fontSize: 12, marginTop: 3 },
  rowValue: { color: C.fg2, fontSize: 14, maxWidth: '65%' },
  rowAction: { color: C.accent, fontSize: 14, fontWeight: '600' },
  note: { color: C.fg3, fontSize: 12, marginTop: 8, marginLeft: 2 },
  danger: { borderColor: C.danger, borderWidth: 1, borderRadius: RADIUS, padding: 15, alignItems: 'center' },
  dangerTxt: { color: C.danger, fontWeight: '700', fontSize: 15 },
  signout: { marginTop: 14, borderColor: C.line2, borderWidth: 1, borderRadius: RADIUS, padding: 15, alignItems: 'center' },
  signoutTxt: { color: C.fg2, fontWeight: '700', fontSize: 15 },
  footer: { color: C.fg3, fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
